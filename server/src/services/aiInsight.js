import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

// A safe, deterministic one-liner if the AI is unavailable.
function fallbackInsight(d) {
  if (d.newlyOverdue?.length) {
    const i = d.newlyOverdue[0];
    return `${i.customer} just went ${i.daysOverdue} days overdue for ${money(i.amount)} — send a reminder today.`;
  }
  if (d.moneyOwed > 0) {
    return `You're owed ${money(d.moneyOwed)} across ${d.openInvoices} invoices. Chase the oldest one this week.`;
  }
  if (d.topJob) {
    return `${d.topJob.name} is your best earner right now (${money(d.topJob.cut)} your cut). Line up the next one like it.`;
  }
  return 'Cash and receivables look steady. Keep invoicing on time to stay ahead.';
}

const SYSTEM = `You are the money guy for a small South Jersey construction contractor (roofing, framing, concrete, HVAC, electrical). Given a JSON snapshot of their week, write ONE short action item in plain, blue-collar language. Dollars and days, not percentages. One or two sentences, direct, no preamble, no greeting. Example tone: "Pelham Build is 14 days overdue — send a reminder today."`;

export async function generateWeeklyInsight(d) {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackInsight(d);
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(d) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || fallbackInsight(d);
  } catch (e) {
    console.error('generateWeeklyInsight error:', e.message);
    return fallbackInsight(d);
  }
}

// Plain-English budget-vs-actual summary for one job (Job Cost feature).
export async function generateJobCostSummary(job) {
  const over = job.varianceDollars;
  const fallback =
    over > 0
      ? `${job.name}: you've spent ${money(job.actualCost)} against a ${money(job.estimatedCost)} budget — ${money(over)} (${job.variancePct}%) over on this job.`
      : `${job.name}: ${money(job.actualCost)} spent against a ${money(job.estimatedCost)} budget — ${money(Math.abs(over))} under. Looking good.`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 160,
      system: [
        {
          type: 'text',
          text: 'You explain a contractor job\'s budget vs. actuals in one or two plain, blue-collar sentences. Use the dollar figures given (estimated/actual revenue, estimated/actual cost, variance). Dollars, not percentages-only. Lead with whether they\'re over or under budget and by how much. Do NOT invent material/labor breakdowns that aren\'t in the data.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: JSON.stringify(job) }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateJobCostSummary error:', e.message);
    return fallback;
  }
}

// A firm-but-professional payment reminder draft for a single overdue invoice.
export async function generateReminderDraft({ customer, amount, daysOverdue, companyName, invoiceNumber }) {
  const fallback =
    `Hi ${customer},\n\nThis is a friendly reminder that invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} for ` +
    `${money(amount)} is now ${daysOverdue} days past due. Please arrange payment at your earliest convenience, ` +
    `or reach out if there's any issue we can sort out.\n\nThanks,\n${companyName || 'The team'}`;

  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim() });
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: [
        {
          type: 'text',
          text: 'Write a short, professional but firm payment-reminder email body for an overdue contractor invoice. Polite, clear about the amount and days overdue, asks for payment or a reply. No subject line, no placeholders in brackets — use the real details given. Sign off with the company name.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: JSON.stringify({ customer, amount, daysOverdue, companyName, invoiceNumber }),
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return text || fallback;
  } catch (e) {
    console.error('generateReminderDraft error:', e.message);
    return fallback;
  }
}
