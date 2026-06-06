/**
 * QuickBooks Online data access.
 *
 * node-quickbooks is callback-based; `call()` promisifies it. The report
 * parsers are intentionally defensive — QBO report JSON is deeply nested and
 * varies by company, so each helper falls back to safe defaults rather than
 * throwing on an unexpected shape.
 */

export function call(qbo, method, ...args) {
  return new Promise((resolve, reject) => {
    qbo[method](...args, (err, data) => {
      if (err) reject(err instanceof Error ? err : new Error(JSON.stringify(err)));
      else resolve(data);
    });
  });
}

export function asArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

export function num(v) {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function ymd(d) {
  return d.toISOString().slice(0, 10);
}

// Finds a report section's summary total, preferring the QBO `group`
// attribute and falling back to a section-header name match.
function findSectionTotal(report, group, nameRegex) {
  let byGroup = null;
  let byName = null;
  const walk = (rows) => {
    for (const r of asArray(rows?.Row)) {
      const header = r.Header?.ColData?.[0]?.value || '';
      if (group && r.group === group && r.Summary?.ColData) {
        byGroup = r.Summary.ColData;
      }
      if (!byName && nameRegex && nameRegex.test(header) && r.Summary?.ColData) {
        byName = r.Summary.ColData;
      }
      if (r.Rows) walk(r.Rows);
    }
  };
  walk(report?.Rows);
  const cols = byGroup || byName;
  if (!cols) return 0;
  return num(cols[cols.length - 1]?.value); // last column = total
}

// Maps the CashFlow report's "net cash increase" row to per-day values.
function parseDailyCashFlow(report) {
  const cols = asArray(report?.Columns?.Column);
  const dateCols = cols.slice(1).map((c) => {
    const meta = asArray(c.MetaData).find(
      (m) => m.Name === 'EndDate' || m.Name === 'StartDate'
    );
    return meta?.Value || c.ColTitle || null;
  });

  let netCols = null;
  const walk = (rows) => {
    for (const r of asArray(rows?.Row)) {
      const label = r.Summary?.ColData?.[0]?.value || r.ColData?.[0]?.value || '';
      if (/net cash (increase|decrease)/i.test(label)) {
        netCols = r.Summary?.ColData || r.ColData;
      }
      if (r.Rows) walk(r.Rows);
    }
  };
  walk(report?.Rows);

  if (!netCols) return [];
  return dateCols.map((date, i) => ({ date, net: num(netCols[i + 1]?.value) }));
}

/**
 * Summary: cash on hand, revenue this month, outstanding receivables.
 * Calls CompanyInfo, ProfitAndLoss (month-to-date), and BalanceSheet (today).
 */
export async function getSummary(qbo, realmId) {
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [company, profitAndLoss, balanceSheet] = await Promise.all([
    call(qbo, 'getCompanyInfo', realmId),
    call(qbo, 'reportProfitAndLoss', {
      start_date: ymd(monthStart),
      end_date: ymd(today),
    }),
    call(qbo, 'reportBalanceSheet', { end_date: ymd(today) }),
  ]);

  return {
    companyName: company?.CompanyName || null,
    cashOnHand: findSectionTotal(balanceSheet, 'BankAccounts', /bank/i),
    revenueThisMonth: findSectionTotal(profitAndLoss, 'Income', /income/i),
    outstandingReceivables: findSectionTotal(balanceSheet, 'AR', /receivable/i),
  };
}

/**
 * The 10 most recent invoices with client, amount, due date, and status.
 * QBO has no explicit pay-status field, so it's derived from the balance.
 */
export async function getRecentInvoices(qbo) {
  const result = await call(qbo, 'findInvoices', { desc: 'TxnDate', limit: 10 });
  const list = asArray(result?.QueryResponse?.Invoice);
  const today = ymd(new Date());

  return list.map((inv) => {
    const balance = num(inv.Balance);
    const status =
      balance <= 0
        ? 'Paid'
        : inv.DueDate && inv.DueDate < today
        ? 'Overdue'
        : 'Open';
    return {
      id: inv.Id,
      client: inv.CustomerRef?.name || 'Unknown',
      amount: num(inv.TotalAmt),
      dueDate: inv.DueDate || null,
      status,
    };
  });
}

/** 90 days of daily net cash flow from the CashFlow report. */
export async function getDailyCashFlow(qbo) {
  const today = new Date();
  const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const report = await call(qbo, 'reportCashFlow', {
    start_date: ymd(start),
    end_date: ymd(today),
    summarize_column_by: 'Days',
  });

  return parseDailyCashFlow(report);
}
