import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getFinancials } from '../services/quickbooks.js';
import { computeHealthScore, buildAlerts } from '../services/insights.js';

const router = Router();

// GET /api/dashboard — aggregate everything the dashboard needs in one call.
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const financials = await getFinancials(req.user.id);

    const payload = {
      source: financials.source, // 'mock' | 'quickbooks'
      cashOnHand: financials.cashOnHand,
      cashTrend: financials.cashTrend,
      outstandingInvoices: financials.outstandingInvoices,
      openInvoiceCount: financials.openInvoiceCount,
      jobs: financials.jobs,
      healthScore: computeHealthScore(financials),
      alerts: buildAlerts(financials),
    };

    res.json(payload);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
