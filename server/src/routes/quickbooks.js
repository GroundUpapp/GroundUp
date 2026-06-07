import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireQuickBooks } from '../middleware/quickbooks.js';
import { requirePro } from '../middleware/plan.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getSummary,
  getRecentInvoices,
  getDailyCashFlow,
} from '../services/qboData.js';
import {
  getCustomers,
  getItems,
  getMoneyOwed,
  getJobs,
  createInvoice,
  createExpense,
  sendInvoiceReminder,
  getJobCost,
  getReminderQueue,
  sendCustomReminder,
  getTaxSummary,
  getPaymentRisk,
  getMonthlyPL,
  getBidEstimate,
} from '../services/qboExtra.js';
import { remindedWithin7Days, logReminder } from '../services/reminderLog.js';

const router = Router();

// All routes require a signed-in user with a connected QuickBooks company.

// GET /api/quickbooks/summary — cash on hand, revenue this month, receivables.
router.get('/quickbooks/summary', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    const summary = await getSummary(req.qbo, req.quickbooks.realmId);
    res.json(summary);
  } catch (err) {
    console.error('QuickBooks summary error:', err);
    res.status(500).json({ error: 'Failed to load QuickBooks summary' });
  }
});

// GET /api/quickbooks/invoices — 10 most recent invoices.
router.get('/quickbooks/invoices', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    const invoices = await getRecentInvoices(req.qbo);
    res.json({ invoices });
  } catch (err) {
    console.error('QuickBooks invoices error:', err);
    res.status(500).json({ error: 'Failed to load QuickBooks invoices' });
  }
});

// GET /api/quickbooks/cashflow — 90 days of daily net cash flow.
router.get('/quickbooks/cashflow', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    const cashflow = await getDailyCashFlow(req.qbo);
    res.json({ cashflow });
  } catch (err) {
    console.error('QuickBooks cashflow error:', err);
    res.status(500).json({ error: 'Failed to load QuickBooks cash flow' });
  }
});

// GET /api/quickbooks/customers — for the invoice / expense pickers.
router.get('/quickbooks/customers', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json({ customers: await getCustomers(req.qbo) });
  } catch (err) {
    console.error('QuickBooks customers error:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

// GET /api/quickbooks/items — sellable items for the invoice line picker.
router.get('/quickbooks/items', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json({ items: await getItems(req.qbo) });
  } catch (err) {
    console.error('QuickBooks items error:', err);
    res.status(500).json({ error: 'Failed to load items' });
  }
});

// GET /api/quickbooks/money-owed — unpaid invoices, oldest first.
router.get('/quickbooks/money-owed', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json({ owed: await getMoneyOwed(req.qbo) });
  } catch (err) {
    console.error('QuickBooks money-owed error:', err);
    res.status(500).json({ error: 'Failed to load money owed' });
  }
});

// GET /api/quickbooks/jobs — job board rows.
router.get('/quickbooks/jobs', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json({ jobs: await getJobs(req.qbo) });
  } catch (err) {
    console.error('QuickBooks jobs error:', err);
    res.status(500).json({ error: 'Failed to load jobs' });
  }
});

// POST /api/quickbooks/invoices — create (and optionally send) an invoice.
router.post('/quickbooks/invoices', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json(await createInvoice(req.qbo, req.body || {}));
  } catch (err) {
    console.error('QuickBooks create-invoice error:', err);
    res.status(400).json({ error: err.message || 'Failed to create invoice' });
  }
});

// POST /api/quickbooks/invoices/:id/remind — AI-drafted reminder, emailed via QBO.
router.post(
  '/quickbooks/invoices/:id/remind',
  requireAuth,
  rateLimit({ name: 'remind', max: 20, window: '1 h' }),
  requireQuickBooks,
  async (req, res) => {
  try {
    const userId = req.user.id;
    const invoiceId = req.params.id;
    if (await remindedWithin7Days(userId, invoiceId)) {
      return res
        .status(429)
        .json({ error: 'You already reminded this customer in the last 7 days.' });
    }
    const result = await sendInvoiceReminder(req.qbo, invoiceId, req.quickbooks.realmId);
    await logReminder(userId, invoiceId, result.customer);
    res.json(result);
  } catch (err) {
    console.error('QuickBooks remind error:', err);
    res.status(400).json({ error: err.message || 'Failed to send reminder' });
  }
});

// POST /api/quickbooks/expenses — log an expense as a purchase.
router.post('/quickbooks/expenses', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json(await createExpense(req.qbo, req.body || {}));
  } catch (err) {
    console.error('QuickBooks create-expense error:', err);
    res.status(400).json({ error: err.message || 'Failed to log expense' });
  }
});

// --- Pro-only features (Solo users get 403 { error: 'pro_required' }) ---

// GET /api/quickbooks/job-cost — job cost vs estimate with AI summaries.
router.get('/quickbooks/job-cost', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    res.json({ jobs: await getJobCost(req.qbo) });
  } catch (err) {
    console.error('QuickBooks job-cost error:', err);
    res.status(500).json({ error: 'Failed to load job cost' });
  }
});

// GET /api/quickbooks/tax-summary — this quarter's expenses grouped by tax
// category, with an AI paragraph the contractor can forward to their accountant.
router.get('/quickbooks/tax-summary', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    res.json(await getTaxSummary(req.qbo, req.quickbooks.realmId));
  } catch (err) {
    console.error('QuickBooks tax-summary error:', err);
    res.status(500).json({ error: 'Failed to load tax summary' });
  }
});

// GET /api/quickbooks/monthly-pl — this month (month-to-date) vs last month's
// P&L (revenue, expenses by category, net) with an AI plain-English comparison.
router.get('/quickbooks/monthly-pl', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    res.json(await getMonthlyPL(req.qbo));
  } catch (err) {
    console.error('QuickBooks monthly-pl error:', err);
    res.status(500).json({ error: 'Failed to load monthly P&L' });
  }
});

// GET /api/quickbooks/payment-risk — per open invoice, an AI late-payment risk
// assessment (on_time / at_risk / likely_late) built from the customer's history.
router.get('/quickbooks/payment-risk', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    res.json({ invoices: await getPaymentRisk(req.qbo) });
  } catch (err) {
    console.error('QuickBooks payment-risk error:', err);
    res.status(500).json({ error: 'Failed to load payment risk' });
  }
});

// POST /api/quickbooks/bid-estimate — recommend a bid for a new job from the
// cost structure (materials/labor/subs/margin) of recent completed jobs.
router.post('/quickbooks/bid-estimate', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    const { jobType, contractValue } = req.body || {};
    res.json(await getBidEstimate(req.qbo, { jobType, contractValue }));
  } catch (err) {
    console.error('QuickBooks bid-estimate error:', err);
    res.status(400).json({ error: err.message || 'Failed to estimate bid' });
  }
});

// GET /api/quickbooks/reminders/queue — overdue invoices + AI-drafted follow-ups.
router.get('/quickbooks/reminders/queue', requireAuth, requirePro, requireQuickBooks, async (req, res) => {
  try {
    res.json({ queue: await getReminderQueue(req.qbo, req.quickbooks.realmId) });
  } catch (err) {
    console.error('QuickBooks reminder-queue error:', err);
    res.status(500).json({ error: 'Failed to load reminders' });
  }
});

// POST /api/quickbooks/reminders/send — send an approved/edited follow-up message.
router.post(
  '/quickbooks/reminders/send',
  requireAuth,
  requirePro,
  rateLimit({ name: 'remind', max: 20, window: '1 h' }),
  requireQuickBooks,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { invoiceId, message } = req.body || {};
      if (!invoiceId) return res.status(400).json({ error: 'Missing invoice.' });
      if (await remindedWithin7Days(userId, invoiceId)) {
        return res
          .status(429)
          .json({ error: 'You already followed up on this invoice in the last 7 days.' });
      }
      const result = await sendCustomReminder(req.qbo, invoiceId, message, req.user.email);
      await logReminder(userId, invoiceId, result.customer);
      res.json(result);
    } catch (err) {
      console.error('QuickBooks reminder-send error:', err);
      res.status(400).json({ error: err.message || 'Failed to send reminder' });
    }
  }
);

export default router;
