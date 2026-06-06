import { getQboClient } from './qboClient.js';
import { getSummary, getDailyCashFlow } from './qboData.js';
import { getMoneyOwed, getJobs } from './qboExtra.js';
import { sendEmail, listConnectedRecipients } from './email.js';
import { weeklyReportEmail, alertEmail } from './emailTemplates.js';
import { generateWeeklyInsight } from './aiInsight.js';
import { hasAlert, recordAlert } from './alertState.js';

function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

function sumLast(arr, n) {
  return (arr || []).slice(-n).reduce((s, d) => s + (Number(d.net) || 0), 0);
}

// Approximate days of cash left from recent burn. Returns null if not burning.
function runwayDays(cashOnHand, daily) {
  const last30 = (daily || []).slice(-30);
  if (last30.length === 0) return null;
  const avg = last30.reduce((s, d) => s + (Number(d.net) || 0), 0) / last30.length;
  if (avg >= 0) return null; // net positive — not running down
  return Math.max(0, Math.round(cashOnHand / Math.abs(avg)));
}

// ---------------------------------------------------------------------------
// 1. Weekly report — one email per connected user.
// ---------------------------------------------------------------------------
export async function runWeeklyReports() {
  const recipients = await listConnectedRecipients();
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  let sent = 0;
  const errors = [];

  for (const { userId, email } of recipients) {
    try {
      const client = await getQboClient(userId);
      if (!client) continue;
      const { qbo, realmId } = client;

      const [summary, owed, jobs, daily] = await Promise.all([
        getSummary(qbo, realmId),
        getMoneyOwed(qbo),
        getJobs(qbo),
        getDailyCashFlow(qbo).catch(() => []),
      ]);

      const cashLastWeek = summary.cashOnHand - sumLast(daily, 7);
      const moneyOwed = owed.reduce((s, i) => s + i.amount, 0);
      const newlyOverdue = owed.filter((i) => i.daysOverdue >= 1 && i.daysOverdue <= 7);
      const topJob =
        jobs.filter((j) => j.invoiced > 0).sort((a, b) => b.cutPct - a.cutPct)[0] || null;

      const insight = await generateWeeklyInsight({
        companyName: summary.companyName,
        cashOnHand: Math.round(summary.cashOnHand),
        cashLastWeek: Math.round(cashLastWeek),
        moneyOwed: Math.round(moneyOwed),
        openInvoices: owed.length,
        newlyOverdue: newlyOverdue.map((i) => ({
          customer: i.customer,
          amount: Math.round(i.amount),
          daysOverdue: i.daysOverdue,
        })),
        topJob: topJob
          ? { name: topJob.name, cut: Math.round(topJob.cut), cutPct: topJob.cutPct }
          : null,
      });

      const html = weeklyReportEmail({
        companyName: summary.companyName,
        weekOf,
        cashOnHand: summary.cashOnHand,
        cashLastWeek,
        moneyOwed,
        openInvoices: owed.length,
        newlyOverdue,
        topJob,
        insight,
      });

      await sendEmail({
        to: email,
        subject: `Your week at a glance — ${summary.companyName || 'your business'}`,
        html,
      });
      sent++;
    } catch (e) {
      console.error(`Weekly report failed for ${userId}:`, e.message);
      errors.push({ userId, error: e.message });
    }
  }

  return { recipients: recipients.length, sent, errors };
}

// ---------------------------------------------------------------------------
// 2. Daily cash-flow alerts — threshold breaches, deduped via the alerts table.
// ---------------------------------------------------------------------------
export async function runCashAlerts() {
  const recipients = await listConnectedRecipients();
  let sent = 0;
  const errors = [];

  for (const { userId, email } of recipients) {
    try {
      const client = await getQboClient(userId);
      if (!client) continue;
      const { qbo, realmId } = client;

      const [summary, owed, daily] = await Promise.all([
        getSummary(qbo, realmId),
        getMoneyOwed(qbo),
        getDailyCashFlow(qbo).catch(() => []),
      ]);

      const fire = async (type, refId, heading, message) => {
        if (await hasAlert(userId, type, refId)) return;
        await sendEmail({ to: email, subject: heading, html: alertEmail({ heading, message }) });
        await recordAlert(userId, type, refId);
        sent++;
      };

      // Cash on hand below $5,000
      if (summary.cashOnHand < 5000) {
        await fire(
          'low_cash',
          '',
          'Your cash is running low',
          `Cash on hand is ${money(summary.cashOnHand)} — under $5,000. Prioritize collections before taking on new material costs.`
        );
      }

      // Cash runway below 30 days
      const runway = runwayDays(summary.cashOnHand, daily);
      if (runway != null && runway < 30) {
        await fire(
          'low_runway',
          '',
          'Your cash runway is short',
          `At your current burn you have about <strong>${runway} days</strong> of cash left. Send reminders on overdue invoices to extend it.`
        );
      }

      // Invoices crossing 7 / 14 / 30 days overdue (one alert per threshold per invoice)
      for (const inv of owed) {
        for (const threshold of [30, 14, 7]) {
          if (inv.daysOverdue >= threshold) {
            await fire(
              'invoice_overdue',
              `${inv.id}:${threshold}`,
              `${inv.customer} is ${threshold} days overdue`,
              `${inv.customer} owes you ${money(inv.amount)} and is now ${inv.daysOverdue} days overdue. Send a reminder from your Money Owed view.`
            );
            break; // only the highest threshold reached, per run
          }
        }
      }
    } catch (e) {
      console.error(`Cash alerts failed for ${userId}:`, e.message);
      errors.push({ userId, error: e.message });
    }
  }

  return { recipients: recipients.length, sent, errors };
}
