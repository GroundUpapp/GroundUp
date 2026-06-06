import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listManualJobs,
  createManualJob,
  deleteManualJob,
} from '../services/manualJobs.js';

const router = Router();

// Manual jobs don't need QuickBooks — just a signed-in user.

// GET /api/jobs/manual — jobs the contractor added by hand.
router.get('/jobs/manual', requireAuth, async (req, res) => {
  try {
    res.json({ jobs: await listManualJobs(req.user.id) });
  } catch (err) {
    console.error('List manual jobs error:', err);
    res.status(500).json({ error: 'Failed to load saved jobs' });
  }
});

// POST /api/jobs/manual — add a job. body: { name, customer, contractAmount }
router.post('/jobs/manual', requireAuth, async (req, res) => {
  try {
    res.json(await createManualJob(req.user.id, req.body || {}));
  } catch (err) {
    console.error('Create manual job error:', err);
    res.status(400).json({ error: err.message || 'Failed to add job' });
  }
});

// DELETE /api/jobs/manual/:id — remove a saved job.
router.delete('/jobs/manual/:id', requireAuth, async (req, res) => {
  try {
    res.json(await deleteManualJob(req.user.id, req.params.id));
  } catch (err) {
    console.error('Delete manual job error:', err);
    res.status(400).json({ error: err.message || 'Failed to remove job' });
  }
});

export default router;
