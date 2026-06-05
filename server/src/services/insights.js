/**
 * Derives the financial health score and AI-style alerts from raw figures.
 * This is deterministic/heuristic today; swap in an LLM or ML model later.
 */

export function computeHealthScore({ cashOnHand, outstandingInvoices, jobs }) {
  // Cash strength: cap contribution at 40 points (~$50k = full marks).
  const cashPoints = Math.min(40, (cashOnHand / 50000) * 40);

  // Receivables drag: heavy outstanding balances relative to cash hurt.
  const arRatio = cashOnHand > 0 ? outstandingInvoices / cashOnHand : 1;
  const arPoints = Math.max(0, 30 - arRatio * 20);

  // Margin health: average job margin, capped at 30 points (30% = full marks).
  const avgMargin =
    jobs.length > 0
      ? jobs.reduce(
          (sum, j) => sum + (j.revenue ? (j.revenue - j.cost) / j.revenue : 0),
          0
        ) / jobs.length
      : 0;
  const marginPoints = Math.min(30, (avgMargin / 0.3) * 30);

  return Math.round(
    Math.max(0, Math.min(100, cashPoints + arPoints + marginPoints))
  );
}

export function buildAlerts({ cashOnHand, outstandingInvoices, jobs }) {
  const alerts = [];

  if (outstandingInvoices > cashOnHand * 0.5) {
    alerts.push({
      id: 'ar-high',
      severity: 'warning',
      title: 'Receivables are piling up',
      message: `You have ${fmt(
        outstandingInvoices
      )} in unpaid invoices — over half your cash on hand. Consider sending reminders.`,
    });
  }

  const thinMargin = jobs.filter(
    (j) => j.revenue && (j.revenue - j.cost) / j.revenue < 0.1
  );
  if (thinMargin.length > 0) {
    alerts.push({
      id: 'thin-margin',
      severity: 'danger',
      title: 'Low-margin jobs detected',
      message: `${thinMargin
        .map((j) => j.name)
        .join(', ')} ${
        thinMargin.length === 1 ? 'is' : 'are'
      } running under a 10% margin. Review change orders and costs.`,
    });
  }

  if (cashOnHand < 15000) {
    alerts.push({
      id: 'low-cash',
      severity: 'danger',
      title: 'Cash runway is tightening',
      message: `Cash on hand is ${fmt(
        cashOnHand
      )}. Prioritize collections before taking on new material costs.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-good',
      severity: 'info',
      title: 'Healthy week',
      message: 'Cash, receivables, and margins all look stable. Nice work.',
    });
  }

  return alerts;
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
