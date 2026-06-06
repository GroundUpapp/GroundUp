import { getQboClient } from '../services/qboClient.js';

// Requires the current user to have a connected QuickBooks company. Refreshes
// the token when needed and attaches a ready node-quickbooks client.
// Must run after requireAuth (needs req.user).
export async function requireQuickBooks(req, res, next) {
  try {
    const client = await getQboClient(req.user.id);
    if (!client) {
      return res.status(412).json({ error: 'QuickBooks not connected' });
    }

    req.quickbooks = {
      accessToken: client.row.access_token,
      refreshToken: client.row.refresh_token,
      realmId: client.realmId,
    };
    req.qbo = client.qbo;
    next();
  } catch (err) {
    console.error('requireQuickBooks error:', err);
    res.status(500).json({ error: 'QuickBooks authorization failed' });
  }
}
