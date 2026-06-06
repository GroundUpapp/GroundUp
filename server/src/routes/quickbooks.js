import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireQuickBooks } from '../middleware/quickbooks.js';
import {
  getSummary,
  getRecentInvoices,
  getDailyCashFlow,
} from '../services/qboData.js';
import {
  getCustomers,
  getMoneyOwed,
  getJobs,
  createInvoice,
  createExpense,
  sendInvoiceReminder,
} from '../services/qboExtra.js';

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

// POST /api/quickbooks/invoices/:id/remind — re-send the invoice as a reminder.
router.post('/quickbooks/invoices/:id/remind', requireAuth, requireQuickBooks, async (req, res) => {
  try {
    res.json(await sendInvoiceReminder(req.qbo, req.params.id, req.body?.email));
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

export default router;
