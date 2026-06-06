import { Router } from 'express';
import { runWeeklyReports, runCashAlerts } from '../services/retention.js';

const router = Router();

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set.
// We require it so these endpoints can't be triggered by the public.
function authorized(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (req.headers.authorization || '') === `Bearer ${secret}`;
}

router.get('/cron/weekly', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    res.json(await runWeeklyReports());
  } catch (e) {
    console.error('cron/weekly error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/cron/alerts', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    res.json(await runCashAlerts());
  } catch (e) {
    console.error('cron/alerts error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
