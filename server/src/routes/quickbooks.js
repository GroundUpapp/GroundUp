import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireQuickBooks } from '../middleware/quickbooks.js';
import {
  getSummary,
  getRecentInvoices,
  getDailyCashFlow,
} from '../services/qboData.js';

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

export default router;
