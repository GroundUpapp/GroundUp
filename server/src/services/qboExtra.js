/**
 * Contractor-facing QuickBooks reads and writes for Ground Up's day-to-day
 * features: invoices, expenses, the job board, money owed, and the data the
 * AI assistant reasons over. Built on the shared helpers in qboData.js.
 *
 * These deliberately make pragmatic choices (a default sales item, a default
 * bank account, keyword-matched expense accounts) so a contractor can fire off
 * an invoice or log an expense without picking GL accounts. All of it is
 * defensive: QBO company files vary, so helpers fall back rather than throw.
 */
import { call, asArray, num, ymd, parseProfitAndLoss } from './qboData.js';
import {
  generateReminderDraft,
  generateJobCostSummary,
  generateTaxSummary,
  generatePaymentRisk,
  generateMonthlyPLSummary,
  generateBidEstimate,
  generateCustomerScorecard,
} from './aiInsight.js';
import { sendEmail } from './email.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function daysBetween(fromYmd, toDate = new Date()) {
  if (!fromYmd) return 0;
  const from = new Date(`${fromYmd}T00:00:00Z`);
  const ms = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()) - from.getTime();
  return Math.floor(ms / 86_400_000);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Sellable items for the invoice line picker: { id, name, rate, type }. */
export async function getItems(qbo) {
  const res = await call(qbo, 'findItems', { fetchAll: true });
  return asArray(res?.QueryResponse?.Item)
    .filter(
      (i) =>
        i.Active !== false &&
        ['Service', 'NonInventory', 'Inventory'].includes(i.Type)
    )
    .map((i) => ({
      id: i.Id,
      name: i.FullyQualifiedName || i.Name,
      rate: num(i.UnitPrice) || null,
      type: i.Type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Active customers for the invoice / expense pickers: { id, name, email }. */
export async function getCustomers(qbo) {
  const res = await call(qbo, 'findCustomers', { fetchAll: true });
  return asArray(res?.QueryResponse?.Customer)
    .filter((c) => c.Active !== false)
    .map((c) => ({
      id: c.Id,
      name: c.FullyQualifiedName || c.DisplayName || c.CompanyName || 'Unnamed',
      email: c.PrimaryEmailAddr?.Address || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * "Money owed to you" — unpaid invoices, oldest first, with days overdue.
 * { id, customer, amount, dueDate, daysOverdue, email }
 */
export async function getMoneyOwed(qbo) {
  const res = await call(qbo, 'findInvoices', { fetchAll: true });
  const open = asArray(res?.QueryResponse?.Invoice).filter((i) => num(i.Balance) > 0.005);

  return open
    .map((i) => {
      const due = i.DueDate || i.TxnDate || null;
      const daysOverdue = Math.max(0, daysBetween(due));
      return {
        id: i.Id,
        number: i.DocNumber || null,
        customer: i.CustomerRef?.name || 'Unknown',
        customerId: i.CustomerRef?.value || null,
        amount: num(i.Balance),
        dueDate: due,
        daysOverdue,
        email: i.BillEmail?.Address || null,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.amount - a.amount);
}

/**
 * Job board — one row per customer/job with money in vs. money out.
 * Aggregates invoices (billed/collected), estimates (contract amount), and
 * purchases (costs) by customer. { id, name, contract, invoiced, collected,
 * costs, cut, cutPct, open }
 */
export async function getJobs(qbo) {
  const [invRes, estRes, purRes] = await Promise.all([
    call(qbo, 'findInvoices', { fetchAll: true }),
    call(qbo, 'findEstimates', { fetchAll: true }).catch(() => null),
    call(qbo, 'findPurchases', { fetchAll: true }).catch(() => null),
  ]);

  const jobs = new Map();
  const job = (id, name) => {
    if (!id) return null;
    if (!jobs.has(id)) {
      jobs.set(id, {
        id,
        name: name || 'Unknown',
        contract: 0,
        invoiced: 0,
        collected: 0,
        costs: 0,
        open: 0,
      });
    }
    return jobs.get(id);
  };

  for (const inv of asArray(invRes?.QueryResponse?.Invoice)) {
    const j = job(inv.CustomerRef?.value, inv.CustomerRef?.name);
    if (!j) continue;
    const total = num(inv.TotalAmt);
    const bal = num(inv.Balance);
    j.invoiced += total;
    j.collected += total - bal;
    j.open += bal;
  }

  // Contract amount ≈ the estimate (the bid) for that customer; take the largest.
  for (const est of asArray(estRes?.QueryResponse?.Estimate)) {
    const j = job(est.CustomerRef?.value, est.CustomerRef?.name);
    if (!j) continue;
    j.contract = Math.max(j.contract, num(est.TotalAmt));
  }

  // Costs = expense lines tagged to the customer/job.
  for (const p of asArray(purRes?.QueryResponse?.Purchase)) {
    for (const line of asArray(p.Line)) {
      const ref = line.AccountBasedExpenseLineDetail?.CustomerRef;
      if (!ref?.value || !jobs.has(ref.value)) continue;
      jobs.get(ref.value).costs += num(line.Amount);
    }
  }

  return [...jobs.values()]
    .map((j) => {
      const contract = j.contract || j.invoiced;
      const cut = j.invoiced - j.costs; // "your cut" in dollars
      return {
        ...j,
        contract,
        cut,
        cutPct: j.invoiced > 0 ? Math.round((cut / j.invoiced) * 100) : 0,
      };
    })
    // Most relevant first: open balances, then biggest jobs.
    .sort((a, b) => b.open - a.open || b.invoiced - a.invoiced);
}

/** Compact, plain-language snapshot the AI assistant reasons over. */
export async function getAssistantContext(qbo, realmId) {
  const { getSummary } = await import('./qboData.js');
  const [summary, owed, jobs] = await Promise.all([
    getSummary(qbo, realmId).catch(() => ({})),
    getMoneyOwed(qbo).catch(() => []),
    getJobs(qbo).catch(() => []),
  ]);

  const owedTotal = owed.reduce((s, i) => s + i.amount, 0);
  const today = new Date();
  const monthName = today.toLocaleString('en-US', { month: 'long' });

  return {
    asOf: ymd(today),
    company: summary.companyName || 'your business',
    cashOnHand: Math.round(summary.cashOnHand || 0),
    revenueThisMonth: Math.round(summary.revenueThisMonth || 0),
    currentMonth: monthName,
    moneyOwed: {
      total: Math.round(owedTotal),
      unpaidInvoices: owed.length,
      oldest: owed.slice(0, 8).map((i) => ({
        customer: i.customer,
        amount: Math.round(i.amount),
        daysOverdue: i.daysOverdue,
      })),
    },
    jobs: jobs.slice(0, 12).map((j) => ({
      name: j.name,
      contract: Math.round(j.contract),
      invoiced: Math.round(j.invoiced),
      collected: Math.round(j.collected),
      costs: Math.round(j.costs),
      yourCut: Math.round(j.cut),
    })),
  };
}

// ---------------------------------------------------------------------------
// Account / item resolution (so contractors never pick GL accounts)
// ---------------------------------------------------------------------------

async function resolveDefaultItem(qbo) {
  const res = await call(qbo, 'findItems', { fetchAll: true });
  const items = asArray(res?.QueryResponse?.Item).filter((i) => i.Active !== false);
  const service = items.find((i) => i.Type === 'Service') || items.find((i) => i.Type === 'NonInventory') || items[0];
  if (!service) {
    throw new Error('No sales item found in QuickBooks. Add a service item first.');
  }
  return { value: service.Id, name: service.Name };
}

const CATEGORY_PATTERNS = {
  materials: /material|supplies|job cost|cost of goods|lumber/i,
  labor: /labor|subcontract|wages|payroll|contract labor/i,
  equipment: /equipment|rental|tools|machine/i,
  fuel: /fuel|gas|auto|vehicle|mileage/i,
  permits: /permit|license|fee|inspection/i,
  other: /.^/, // never matches; falls through to default
};

async function resolveAccounts(qbo) {
  const res = await call(qbo, 'findAccounts', { fetchAll: true });
  const accounts = asArray(res?.QueryResponse?.Account).filter((a) => a.Active !== false);

  const bank = accounts.find((a) => a.AccountType === 'Bank');
  if (!bank) {
    throw new Error('No bank account found in QuickBooks. Add one to log expenses.');
  }

  const expenses = accounts.filter(
    (a) => a.AccountType === 'Expense' || a.AccountType === 'CostOfGoodsSold'
  );

  function forCategory(category) {
    const pattern = CATEGORY_PATTERNS[category];
    const match = pattern && expenses.find((a) => pattern.test(a.Name));
    const acct = match || expenses[0];
    if (!acct) throw new Error('No expense account found in QuickBooks.');
    return { value: acct.Id, name: acct.Name };
  }

  return { bank: { value: bank.Id, name: bank.Name }, forCategory };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create an invoice from { customerId, customerEmail, lineItems, dueDate, send }.
 * lineItems: [{ description, qty, rate }]. Optionally emails it to the customer.
 */
export async function createInvoice(qbo, { customerId, customerEmail, lineItems = [], dueDate, send }) {
  if (!customerId) throw new Error('Pick a customer.');
  const clean = lineItems
    .map((l) => ({
      description: String(l.description || '').trim(),
      qty: num(l.qty) || 1,
      rate: num(l.rate),
      itemId: l.itemId ? String(l.itemId) : null,
    }))
    .filter((l) => l.description || l.rate);
  if (clean.length === 0) throw new Error('Add at least one line item.');

  // Only fall back to a default sales item for lines that didn't pick one.
  const defaultItem = clean.some((l) => !l.itemId) ? await resolveDefaultItem(qbo) : null;

  const Line = clean.map((l) => ({
    DetailType: 'SalesItemLineDetail',
    Amount: Math.round(l.qty * l.rate * 100) / 100,
    Description: l.description,
    SalesItemLineDetail: {
      ItemRef: l.itemId ? { value: l.itemId } : defaultItem,
      Qty: l.qty,
      UnitPrice: l.rate,
    },
  }));

  const invoice = {
    CustomerRef: { value: String(customerId) },
    Line,
    ...(dueDate ? { DueDate: dueDate } : {}),
    ...(customerEmail ? { BillEmail: { Address: customerEmail } } : {}),
  };

  const created = await call(qbo, 'createInvoice', invoice);
  const id = created?.Id;

  let emailed = false;
  if (send && customerEmail && id) {
    try {
      await call(qbo, 'sendInvoicePdf', id, customerEmail);
      emailed = true;
    } catch (e) {
      // Invoice was created; surface the email failure without losing the invoice.
      console.error('sendInvoicePdf failed:', e.message);
    }
  }

  return {
    id,
    number: created?.DocNumber || null,
    total: num(created?.TotalAmt),
    emailed,
  };
}

/**
 * Log an expense as a QuickBooks Purchase.
 * { payee, amount, category, jobId, memo } — fast path for "paid from the truck".
 */
export async function createExpense(qbo, { payee, amount, category = 'other', jobId, memo }) {
  const value = num(amount);
  if (!(value > 0)) throw new Error('Enter an amount.');

  const { bank, forCategory } = await resolveAccounts(qbo);
  const expenseAcct = forCategory(category);

  const description = [payee, memo].filter(Boolean).join(' — ') || `${category} expense`;

  const purchase = {
    PaymentType: 'Check',
    AccountRef: bank,
    TxnDate: ymd(new Date()),
    PrivateNote: payee ? `Paid: ${payee}` : undefined,
    Line: [
      {
        Amount: Math.round(value * 100) / 100,
        DetailType: 'AccountBasedExpenseLineDetail',
        Description: description,
        AccountBasedExpenseLineDetail: {
          AccountRef: expenseAcct,
          ...(jobId ? { CustomerRef: { value: String(jobId) }, BillableStatus: 'NotBillable' } : {}),
        },
      },
    ],
  };

  const created = await call(qbo, 'createPurchase', purchase);
  return {
    id: created?.Id,
    amount: num(created?.TotalAmt) || value,
    account: expenseAcct.name,
    category,
  };
}

/**
 * Send a payment reminder for an overdue invoice. Drafts a firm, professional
 * note with the AI (returned/logged), then emails the invoice via QuickBooks'
 * email API (sendInvoicePdf). Returns the customer + draft for the UI.
 */
export async function sendInvoiceReminder(qbo, invoiceId, realmId) {
  if (!invoiceId) throw new Error('Missing invoice.');

  const inv = await call(qbo, 'getInvoice', String(invoiceId));
  // Only ever send to the email on file in QuickBooks — never a client-supplied
  // address — so this can't be used to send invoices to arbitrary recipients.
  const email = inv?.BillEmail?.Address;
  if (!email) throw new Error('No email on file for this customer.');

  const customer = inv?.CustomerRef?.name || 'Customer';
  const amount = num(inv?.Balance);
  const due = inv?.DueDate;
  const daysOverdue = due
    ? Math.max(0, Math.floor((Date.now() - Date.parse(`${due}T00:00:00Z`)) / 86_400_000))
    : 0;

  let companyName = null;
  if (realmId) {
    try {
      const company = await call(qbo, 'getCompanyInfo', realmId);
      companyName = company?.CompanyName || null;
    } catch {
      /* non-fatal */
    }
  }

  const draft = await generateReminderDraft({
    customer,
    amount,
    daysOverdue,
    companyName,
    invoiceNumber: inv?.DocNumber,
  });

  await call(qbo, 'sendInvoicePdf', String(invoiceId), email);
  return { sent: true, email, customer, draft };
}

// ---------------------------------------------------------------------------
// Pro features
// ---------------------------------------------------------------------------

/**
 * Job Cost vs Estimate. QBO has no stored cost budget, so the budget is derived
 * from the estimate/contract at a target margin (COST_RATIO). Returns per job:
 * estimated/actual revenue, estimated/actual cost, variance, status, AI summary.
 */
export async function getJobCost(qbo) {
  const COST_RATIO = 0.7; // ~30% target margin assumption (no cost budget in QBO)
  const jobs = (await getJobs(qbo))
    .filter((j) => j.invoiced > 0 || j.costs > 0 || j.contract > 0)
    .slice(0, 12);

  const rows = jobs.map((j) => {
    const estimatedRevenue = Math.round(j.contract || j.invoiced);
    const actualRevenue = Math.round(j.invoiced);
    const estimatedCost = Math.round(estimatedRevenue * COST_RATIO);
    const actualCost = Math.round(j.costs);
    const varianceDollars = actualCost - estimatedCost; // positive = over budget
    const variancePct = estimatedCost > 0 ? Math.round((varianceDollars / estimatedCost) * 100) : 0;
    const status = variancePct <= 5 ? 'on_track' : variancePct <= 15 ? 'at_risk' : 'over_budget';
    return {
      id: j.id,
      name: j.name,
      estimatedRevenue,
      actualRevenue,
      estimatedCost,
      actualCost,
      varianceDollars,
      variancePct,
      status,
    };
  });

  return Promise.all(rows.map(async (r) => ({ ...r, summary: await generateJobCostSummary(r) })));
}

// The tax categories the contractor cares about, matched against an expense
// line's GL account name (and description as a fallback). Order matters:
// subcontractors is checked before labor so "contract labor" lands correctly,
// and everything that matches nothing falls through to "other".
const TAX_CATEGORY_PATTERNS = [
  ['subcontractors', /subcontract|sub-contract|sub contractor|1099|contract labor/i],
  ['labor', /labor|labour|wages|payroll|crew/i],
  ['materials', /material|supplies|lumber|cost of goods|job cost/i],
  ['equipment', /equipment|rental|tools|machine/i],
  ['fuel', /fuel|gas|gasoline|diesel|auto|vehicle|mileage/i],
];

function classifyTaxCategory(...texts) {
  const hay = texts.filter(Boolean).join(' ');
  for (const [category, pattern] of TAX_CATEGORY_PATTERNS) {
    if (pattern.test(hay)) return category;
  }
  return 'other';
}

// Calendar quarter containing `today`, as { start, end, label } with YYYY-MM-DD
// bounds (start of quarter → today) and a "Q2 2026"-style label.
function currentQuarter(today = new Date()) {
  const year = today.getUTCFullYear();
  const q = Math.floor(today.getUTCMonth() / 3); // 0–3
  const start = new Date(Date.UTC(year, q * 3, 1));
  return { start: ymd(start), end: ymd(today), label: `Q${q + 1} ${year}` };
}

/**
 * Tax prep summary (Pro). Pulls this quarter's expenses (QBO Purchases) from
 * QuickBooks, groups the line amounts into the contractor's tax categories
 * (materials, labor, subcontractors, equipment, fuel, other), and hands the
 * totals to Claude for a plain-English paragraph they can forward to their
 * accountant. Returns { quarter, startDate, endDate, total, breakdown, paragraph }.
 */
export async function getTaxSummary(qbo, realmId) {
  const { start, end, label } = currentQuarter();

  const res = await call(qbo, 'findPurchases', { fetchAll: true }).catch(() => null);
  const purchases = asArray(res?.QueryResponse?.Purchase).filter((p) => {
    const d = p.TxnDate;
    return d && d >= start && d <= end;
  });

  const breakdown = { materials: 0, labor: 0, subcontractors: 0, equipment: 0, fuel: 0, other: 0 };
  let total = 0;

  for (const p of purchases) {
    const payee = p.EntityRef?.name;
    for (const line of asArray(p.Line)) {
      const detail = line.AccountBasedExpenseLineDetail;
      if (!detail) continue; // skip non-expense lines (e.g. item-based)
      const amount = num(line.Amount);
      if (!amount) continue;
      const category = classifyTaxCategory(detail.AccountRef?.name, line.Description, payee);
      breakdown[category] += amount;
      total += amount;
    }
  }

  for (const k of Object.keys(breakdown)) breakdown[k] = Math.round(breakdown[k]);
  total = Math.round(total);

  let companyName = null;
  if (realmId) {
    try {
      const c = await call(qbo, 'getCompanyInfo', realmId);
      companyName = c?.CompanyName || null;
    } catch {
      /* non-fatal */
    }
  }

  const paragraph = await generateTaxSummary({ quarter: label, companyName, total, breakdown });

  return { quarter: label, startDate: start, endDate: end, total, breakdown, paragraph };
}

// This month (month-to-date) and last month (full calendar month) bounds, each
// with a "June 2026"-style label. All in UTC to match QBO's date handling.
function monthRanges(today = new Date()) {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const thisStart = new Date(Date.UTC(y, m, 1));
  const lastStart = new Date(Date.UTC(y, m - 1, 1));
  const lastEnd = new Date(Date.UTC(y, m, 0)); // day 0 of this month = last day of prev
  const label = (d) =>
    d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    thisMonth: { start: ymd(thisStart), end: ymd(today), label: label(thisStart) },
    lastMonth: { start: ymd(lastStart), end: ymd(lastEnd), label: label(lastStart) },
  };
}

/**
 * Monthly P&L (Pro). Pulls this month (month-to-date) and last month's
 * ProfitAndLoss from QuickBooks — revenue, expenses by category, and net — then
 * hands both to Claude for a plain-English paragraph comparing them. The two
 * month objects feed the dashboard's two-column comparison directly.
 * Returns { thisMonth, lastMonth, paragraph }.
 */
export async function getMonthlyPL(qbo) {
  const ranges = monthRanges();

  const [thisReport, lastReport] = await Promise.all([
    call(qbo, 'reportProfitAndLoss', {
      start_date: ranges.thisMonth.start,
      end_date: ranges.thisMonth.end,
    }),
    call(qbo, 'reportProfitAndLoss', {
      start_date: ranges.lastMonth.start,
      end_date: ranges.lastMonth.end,
    }),
  ]);

  const thisMonth = { ...ranges.thisMonth, partial: true, ...parseProfitAndLoss(thisReport) };
  const lastMonth = { ...ranges.lastMonth, partial: false, ...parseProfitAndLoss(lastReport) };

  const paragraph = await generateMonthlyPLSummary({ thisMonth, lastMonth });

  return { thisMonth, lastMonth, paragraph };
}

/**
 * Late-payment predictor (Pro). For each open invoice, builds the customer's
 * payment history from their settled invoices — average days to pay, late-payment
 * rate, and their last 4 invoices — and asks the AI for a risk assessment
 * (on_time / at_risk / likely_late) with a plain-English reason.
 *
 * "When was an invoice paid?" isn't a field on the invoice, so it's derived from
 * the Payment transactions linked to each invoice (earliest linked payment date).
 */
export async function getPaymentRisk(qbo) {
  const [invRes, payRes] = await Promise.all([
    call(qbo, 'findInvoices', { fetchAll: true }),
    call(qbo, 'findPayments', { fetchAll: true }).catch(() => null),
  ]);
  const invoices = asArray(invRes?.QueryResponse?.Invoice);

  // invoiceId -> earliest date a linked payment was received.
  const paidOn = new Map();
  for (const pmt of asArray(payRes?.QueryResponse?.Payment)) {
    const when = pmt.TxnDate;
    if (!when) continue;
    for (const line of asArray(pmt.Line)) {
      for (const lt of asArray(line.LinkedTxn)) {
        if (lt.TxnType === 'Invoice' && lt.TxnId) {
          const prev = paidOn.get(lt.TxnId);
          if (!prev || when < prev) paidOn.set(lt.TxnId, when);
        }
      }
    }
  }

  // Per-customer history from fully-settled invoices.
  const historyByCustomer = new Map();
  for (const inv of invoices) {
    const custId = inv.CustomerRef?.value;
    const issued = inv.TxnDate;
    const paid = paidOn.get(inv.Id);
    // Only settled invoices (paid in full, with a known payment date) count.
    if (!custId || !issued || !paid || num(inv.Balance) > 0.005 || num(inv.TotalAmt) <= 0) continue;
    const paidDate = new Date(`${paid}T00:00:00Z`);
    const due = inv.DueDate || null;
    if (!historyByCustomer.has(custId)) historyByCustomer.set(custId, []);
    historyByCustomer.get(custId).push({
      number: inv.DocNumber || null,
      amount: Math.round(num(inv.TotalAmt)),
      paid,
      daysToPay: Math.max(0, daysBetween(issued, paidDate)),
      late: due ? paid > due : false,
    });
  }

  // Compact history summary for one customer: averages + their last 4 invoices.
  function summarize(custId) {
    const records = (historyByCustomer.get(custId) || [])
      .slice()
      .sort((a, b) => (a.paid < b.paid ? 1 : -1)); // most recent first
    const n = records.length;
    if (n === 0) {
      return { invoicesPaid: 0, avgDaysToPay: null, latePaymentRate: 0, lastFour: [], lastFourLate: 0, lastFourCount: 0 };
    }
    const lastFour = records.slice(0, 4);
    return {
      invoicesPaid: n,
      avgDaysToPay: Math.round(records.reduce((s, r) => s + r.daysToPay, 0) / n),
      latePaymentRate: records.filter((r) => r.late).length / n,
      lastFour,
      lastFourLate: lastFour.filter((r) => r.late).length,
      lastFourCount: lastFour.length,
    };
  }

  // Open invoices, biggest balances first; cap the AI fan-out.
  const open = invoices
    .filter((inv) => num(inv.Balance) > 0.005)
    .sort((a, b) => num(b.Balance) - num(a.Balance))
    .slice(0, 25);

  return Promise.all(
    open.map(async (inv) => {
      const customer = inv.CustomerRef?.name || 'Unknown';
      const due = inv.DueDate || inv.TxnDate || null;
      const daysOverdue = Math.max(0, daysBetween(due));
      const history = summarize(inv.CustomerRef?.value);
      const { risk, reason } = await generatePaymentRisk({
        customer,
        amount: Math.round(num(inv.Balance)),
        daysOverdue,
        dueDate: due,
        history,
      });
      return {
        id: inv.Id,
        number: inv.DocNumber || null,
        customer,
        amount: num(inv.Balance),
        dueDate: due,
        daysOverdue,
        risk,
        reason,
        history: {
          invoicesPaid: history.invoicesPaid,
          avgDaysToPay: history.avgDaysToPay,
          latePaymentRate: Math.round(history.latePaymentRate * 100),
          lastFourLate: history.lastFourLate,
          lastFourCount: history.lastFourCount,
        },
      };
    })
  );
}

/** Overdue invoices with an AI-drafted follow-up message for each (Pro queue). */
export async function getReminderQueue(qbo, realmId) {
  const overdue = (await getMoneyOwed(qbo)).filter((i) => i.daysOverdue > 0).slice(0, 15);

  let companyName = null;
  if (realmId) {
    try {
      const c = await call(qbo, 'getCompanyInfo', realmId);
      companyName = c?.CompanyName || null;
    } catch {
      /* non-fatal */
    }
  }

  return Promise.all(
    overdue.map(async (i) => ({
      id: i.id,
      customer: i.customer,
      amount: i.amount,
      daysOverdue: i.daysOverdue,
      number: i.number,
      draft: await generateReminderDraft({
        customer: i.customer,
        amount: i.amount,
        daysOverdue: i.daysOverdue,
        companyName,
        invoiceNumber: i.number,
      }),
    }))
  );
}

/** Send an approved/edited follow-up message to the customer's on-file email. */
export async function sendCustomReminder(qbo, invoiceId, message, replyTo) {
  if (!invoiceId) throw new Error('Missing invoice.');
  const text = String(message || '').trim();
  if (!text) throw new Error('Message is empty.');

  const inv = await call(qbo, 'getInvoice', String(invoiceId));
  const email = inv?.BillEmail?.Address; // on-file only — never client-supplied
  if (!email) throw new Error('No email on file for this customer.');

  const customer = inv?.CustomerRef?.name || 'Customer';
  const docNum = inv?.DocNumber;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(
    text
  )}</div>`;

  await sendEmail({
    to: email,
    subject: `Payment reminder${docNum ? ` — invoice #${docNum}` : ''}`,
    html,
    replyTo,
  });
  return { sent: true, customer, email };
}

// Deterministic 0–100 customer score (higher = better) from pay behavior and
// margin. Drives the default ordering and the green/yellow/red tier, and keeps
// the AI's ranking honest (it's the full fallback when the AI is unavailable).
function scoreCustomer(c) {
  let s = 50;
  if (c.avgDaysToPay != null) {
    if (c.avgDaysToPay <= 15) s += 20;
    else if (c.avgDaysToPay <= 30) s += 8;
    else if (c.avgDaysToPay <= 45) s -= 6;
    else s -= 18;
  }
  if (c.latePaymentRate != null) {
    if (c.latePaymentRate === 0) s += 15;
    else if (c.latePaymentRate <= 25) s += 4;
    else if (c.latePaymentRate <= 50) s -= 12;
    else s -= 25;
  }
  if (c.marginPct != null) {
    if (c.marginPct >= 30) s += 15;
    else if (c.marginPct >= 15) s += 6;
    else if (c.marginPct >= 0) s -= 4;
    else s -= 20;
  }
  return Math.max(0, Math.min(100, s));
}

const tierForScore = (score) => (score >= 65 ? 'top' : score >= 42 ? 'average' : 'problematic');

/**
 * Customer Scorecard (Pro). For every customer with invoice history, computes
 * total revenue, average invoice size, average days to pay, late-payment rate,
 * number of jobs, and profit margin (when job costs are tracked), then hands the
 * lot to Claude to rank best-to-worst and write a plain-English summary.
 * Returns { summary, customers: [{ ...metrics, tier, note }] }, best first.
 *
 * Days-to-pay/lateness are derived the same way the late-payment predictor does:
 * an invoice's "paid on" date is the earliest payment transaction linked to it.
 * Jobs ≈ the customer's estimates (bids); costs ≈ expenses tagged to them.
 */
export async function getCustomerScorecard(qbo) {
  const [invRes, payRes, estRes, purRes] = await Promise.all([
    call(qbo, 'findInvoices', { fetchAll: true }),
    call(qbo, 'findPayments', { fetchAll: true }).catch(() => null),
    call(qbo, 'findEstimates', { fetchAll: true }).catch(() => null),
    call(qbo, 'findPurchases', { fetchAll: true }).catch(() => null),
  ]);
  const invoices = asArray(invRes?.QueryResponse?.Invoice);

  // invoiceId -> earliest date a linked payment was received.
  const paidOn = new Map();
  for (const pmt of asArray(payRes?.QueryResponse?.Payment)) {
    const when = pmt.TxnDate;
    if (!when) continue;
    for (const line of asArray(pmt.Line)) {
      for (const lt of asArray(line.LinkedTxn)) {
        if (lt.TxnType === 'Invoice' && lt.TxnId) {
          const prev = paidOn.get(lt.TxnId);
          if (!prev || when < prev) paidOn.set(lt.TxnId, when);
        }
      }
    }
  }

  const estimatesByCustomer = new Map();
  for (const est of asArray(estRes?.QueryResponse?.Estimate)) {
    const id = est.CustomerRef?.value;
    if (id) estimatesByCustomer.set(id, (estimatesByCustomer.get(id) || 0) + 1);
  }

  const costsByCustomer = new Map();
  for (const p of asArray(purRes?.QueryResponse?.Purchase)) {
    for (const line of asArray(p.Line)) {
      const ref = line.AccountBasedExpenseLineDetail?.CustomerRef;
      if (ref?.value) {
        costsByCustomer.set(ref.value, (costsByCustomer.get(ref.value) || 0) + num(line.Amount));
      }
    }
  }

  // Aggregate revenue + payment behavior per customer from their invoices.
  const byCustomer = new Map();
  for (const inv of invoices) {
    const id = inv.CustomerRef?.value;
    if (!id) continue;
    const total = num(inv.TotalAmt);
    if (total <= 0) continue; // skip zero-dollar / credit invoices
    if (!byCustomer.has(id)) {
      byCustomer.set(id, {
        id,
        name: inv.CustomerRef?.name || 'Unknown',
        revenue: 0,
        invoiceCount: 0,
        daysToPaySum: 0,
        settled: 0,
        late: 0,
      });
    }
    const r = byCustomer.get(id);
    r.revenue += total;
    r.invoiceCount += 1;

    // Only fully-settled invoices (paid in full, with a known payment date)
    // inform how fast and how reliably the customer pays.
    const issued = inv.TxnDate;
    const paid = paidOn.get(inv.Id);
    if (issued && paid && num(inv.Balance) <= 0.005) {
      r.settled += 1;
      r.daysToPaySum += Math.max(0, daysBetween(issued, new Date(`${paid}T00:00:00Z`)));
      if (inv.DueDate && paid > inv.DueDate) r.late += 1;
    }
  }

  const customers = [...byCustomer.values()]
    .map((r) => {
      const revenue = Math.round(r.revenue);
      const costs = Math.round(costsByCustomer.get(r.id) || 0);
      const hasCosts = costs > 0;
      const c = {
        id: r.id,
        name: r.name,
        revenue,
        invoiceCount: r.invoiceCount,
        avgInvoice: Math.round(revenue / r.invoiceCount),
        avgDaysToPay: r.settled ? Math.round(r.daysToPaySum / r.settled) : null,
        latePaymentRate: r.settled ? Math.round((r.late / r.settled) * 100) : null,
        invoicesPaid: r.settled,
        jobs: estimatesByCustomer.get(r.id) || r.invoiceCount,
        margin: hasCosts ? revenue - costs : null,
        marginPct: hasCosts && revenue > 0 ? Math.round(((revenue - costs) / revenue) * 100) : null,
      };
      const score = scoreCustomer(c);
      return { ...c, score, tier: tierForScore(score) };
    })
    // Biggest customers first; cap the AI payload for very large company files.
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 25);

  const { summary, ranking } = await generateCustomerScorecard(customers);

  // Join the AI's ranking (name, tier, note, in order) back onto the full metric
  // rows. The ranking is guaranteed complete and ordered best-first.
  const norm = (s) => String(s || '').trim().toLowerCase();
  const byName = new Map(customers.map((c) => [norm(c.name), c]));
  const ordered = ranking
    .map((r) => {
      const c = byName.get(norm(r.name));
      if (!c) return null;
      const { score, ...metrics } = c;
      return { ...metrics, tier: r.tier, note: r.note };
    })
    .filter(Boolean);

  return { summary, customers: ordered };
}

/**
 * Bid Estimator (Pro). Looks at the contractor's last 10 completed jobs in
 * QuickBooks and learns their cost structure — materials, labor, and
 * subcontractors as a share of revenue, plus the margin they actually kept —
 * then, given a new job's estimated contract value, recommends the minimum bid
 * to protect that usual margin and asks Claude for a plain-English call.
 *
 * "Job" = one customer/job. "Completed" = invoiced and fully paid (no open
 * balance) with real costs booked against it. Recency = latest invoice date.
 * The recommended bid is built from the more conservative of the all-time and
 * recent cost ratios, so if costs have been creeping up it nudges the bid above
 * the entered value rather than quietly eating the contractor's margin.
 *
 * Returns: { jobType, contractValue, jobCount, averages, projection,
 * recommendedBid, flags, recommendation }.
 */
export async function getBidEstimate(qbo, { jobType, contractValue } = {}) {
  const value = num(contractValue);
  if (!(value > 0)) throw new Error('Enter an estimated contract value.');
  const type = String(jobType || '').trim() || null;

  const [invRes, purRes] = await Promise.all([
    call(qbo, 'findInvoices', { fetchAll: true }),
    call(qbo, 'findPurchases', { fetchAll: true }).catch(() => null),
  ]);

  // One row per customer/job: revenue, open balance, recency, costs by category.
  const jobs = new Map();
  const job = (id, name) => {
    if (!id) return null;
    if (!jobs.has(id)) {
      jobs.set(id, {
        id,
        name: name || 'Unknown',
        invoiced: 0,
        balance: 0,
        lastInvoice: null,
        materials: 0,
        labor: 0,
        subcontractors: 0,
        otherCost: 0,
      });
    }
    return jobs.get(id);
  };

  for (const inv of asArray(invRes?.QueryResponse?.Invoice)) {
    const j = job(inv.CustomerRef?.value, inv.CustomerRef?.name);
    if (!j) continue;
    j.invoiced += num(inv.TotalAmt);
    j.balance += num(inv.Balance);
    const d = inv.TxnDate || null;
    if (d && (!j.lastInvoice || d > j.lastInvoice)) j.lastInvoice = d;
  }

  // Costs = expense lines tagged to the customer/job, bucketed with the same
  // category classifier the Tax Summary uses (subcontractors before labor, etc).
  for (const p of asArray(purRes?.QueryResponse?.Purchase)) {
    const payee = p.EntityRef?.name;
    for (const line of asArray(p.Line)) {
      const detail = line.AccountBasedExpenseLineDetail;
      const ref = detail?.CustomerRef;
      if (!ref?.value || !jobs.has(ref.value)) continue;
      const amount = num(line.Amount);
      if (!amount) continue;
      const cat = classifyTaxCategory(detail.AccountRef?.name, line.Description, payee);
      const j = jobs.get(ref.value);
      if (cat === 'materials') j.materials += amount;
      else if (cat === 'labor') j.labor += amount;
      else if (cat === 'subcontractors') j.subcontractors += amount;
      else j.otherCost += amount; // equipment, fuel, other
    }
  }

  // Completed = fully paid, with revenue and real costs. Most recent first, top 10.
  const completed = [...jobs.values()]
    .map((j) => ({ ...j, totalCost: j.materials + j.labor + j.subcontractors + j.otherCost }))
    .filter((j) => j.invoiced > 0 && j.balance <= 0.005 && j.totalCost > 0)
    .sort((a, b) => ((a.lastInvoice || '') < (b.lastInvoice || '') ? 1 : -1))
    .slice(0, 10);

  if (completed.length === 0) {
    return {
      jobType: type,
      contractValue: Math.round(value),
      jobCount: 0,
      averages: null,
      projection: null,
      recommendedBid: null,
      flags: [],
      recommendation:
        "You don't have any completed, fully-paid jobs with costs in QuickBooks yet, so " +
        'there\'s no history to base a bid on. Finish and collect on a few jobs — with ' +
        'expenses logged against them — and your bid history will build automatically.',
    };
  }

  // Per-job shares of revenue, then simple (equal-weight) averages across the set.
  const ratio = (n, d) => (d > 0 ? n / d : 0);
  const per = completed.map((j) => ({
    materialPct: ratio(j.materials, j.invoiced),
    laborPct: ratio(j.labor, j.invoiced),
    subPct: ratio(j.subcontractors, j.invoiced),
    costPct: ratio(j.totalCost, j.invoiced),
    marginPct: 1 - ratio(j.totalCost, j.invoiced),
  }));
  const mean = (sel, set = per) => set.reduce((s, p) => s + sel(p), 0) / set.length;

  const avgMaterialPct = mean((p) => p.materialPct);
  const avgLaborPct = mean((p) => p.laborPct);
  const avgSubPct = mean((p) => p.subPct);
  const avgCostPct = mean((p) => p.costPct);
  const avgMarginPct = mean((p) => p.marginPct);

  // Recent trend = the most recent few jobs (the set is already newest-first).
  const recent = per.slice(0, Math.min(3, per.length));
  const recentCostPct = mean((p) => p.costPct, recent);

  // Recommend a bid that holds the usual margin even at the (possibly higher)
  // recent cost rate. With stable costs this lands at ~the entered value.
  const denom = Math.max(0.05, 1 - avgMarginPct); // guard against divide-by-zero
  const costBasis = Math.max(avgCostPct, recentCostPct);
  const recommendedBid = Math.round((value * costBasis) / denom);

  // Flag any cost category running materially higher lately than its all-time avg.
  const HIGH = 0.03; // 3 percentage points of revenue
  const flags = [
    ['materials', avgMaterialPct, mean((p) => p.materialPct, recent)],
    ['labor', avgLaborPct, mean((p) => p.laborPct, recent)],
    ['subcontractors', avgSubPct, mean((p) => p.subPct, recent)],
  ]
    .filter(([, hist, rec]) => rec - hist >= HIGH)
    .map(([category, hist, rec]) => ({
      category,
      historicalPct: Math.round(hist * 100),
      recentPct: Math.round(rec * 100),
    }));

  // Expected cost split for the entered contract value (for the breakdown view).
  const projection = {
    materials: Math.round(value * avgMaterialPct),
    labor: Math.round(value * avgLaborPct),
    subcontractors: Math.round(value * avgSubPct),
    totalCost: Math.round(value * avgCostPct),
    profit: Math.round(value * avgMarginPct),
  };

  const averages = {
    marginPct: Math.round(avgMarginPct * 100),
    materialPct: Math.round(avgMaterialPct * 100),
    laborPct: Math.round(avgLaborPct * 100),
    subPct: Math.round(avgSubPct * 100),
  };

  const recommendation = await generateBidEstimate({
    jobType: type,
    contractValue: Math.round(value),
    jobCount: completed.length,
    usualMarginPct: averages.marginPct,
    materialPct: averages.materialPct,
    laborPct: averages.laborPct,
    subPct: averages.subPct,
    recommendedBid,
    flags,
  });

  return {
    jobType: type,
    contractValue: Math.round(value),
    jobCount: completed.length,
    averages,
    projection,
    recommendedBid,
    flags,
    recommendation,
  };
}
