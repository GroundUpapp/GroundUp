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
import { call, asArray, num, ymd } from './qboData.js';
import { generateReminderDraft, generateJobCostSummary } from './aiInsight.js';
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
