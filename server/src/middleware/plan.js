import { getPlan, hasProAccess } from '../services/subscriptions.js';

// Gates Pro-only endpoints. Must run after requireAuth (needs req.user).
// Trial users are treated as Pro. Solo users get 403 { error: 'pro_required' }.
export async function requirePro(req, res, next) {
  try {
    const plan = await getPlan(req.user.id);
    req.plan = plan;
    if (hasProAccess(plan)) return next();
    return res.status(403).json({ error: 'pro_required' });
  } catch (err) {
    console.error('requirePro error:', err);
    res.status(500).json({ error: 'Failed to verify plan' });
  }
}
