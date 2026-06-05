import QuickBooks from 'node-quickbooks';
import { getTokenRow, saveTokenRow } from '../services/quickbooksTokens.js';
import { refreshAccessToken, USE_SANDBOX } from '../services/intuit.js';

// Requires the current user to have a connected QuickBooks company. Refreshes
// the access token via the stored refresh token when it's expired (or about to
// be), persists the new tokens, and attaches a ready node-quickbooks client.
// Must run after requireAuth (needs req.user).
export async function requireQuickBooks(req, res, next) {
  try {
    const userId = req.user.id;
    let row = await getTokenRow(userId);

    if (!row) {
      return res.status(412).json({ error: 'QuickBooks not connected' });
    }

    // Refresh when expired or within 60s of expiry.
    const expiresMs = row.expires_at ? Date.parse(row.expires_at) : 0;
    if (!expiresMs || expiresMs - Date.now() < 60_000) {
      const token = await refreshAccessToken(row.refresh_token);
      const expires_at = new Date(Date.now() + token.expires_in * 1000).toISOString();
      await saveTokenRow(userId, {
        access_token: token.access_token,
        refresh_token: token.refresh_token || row.refresh_token,
        realm_id: row.realm_id,
        expires_at,
      });
      row = {
        ...row,
        access_token: token.access_token,
        refresh_token: token.refresh_token || row.refresh_token,
        expires_at,
      };
    }

    req.quickbooks = {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      realmId: row.realm_id,
    };
    req.qbo = new QuickBooks(
      process.env.QUICKBOOKS_CLIENT_ID,
      process.env.QUICKBOOKS_CLIENT_SECRET,
      row.access_token,
      false, // no token secret (OAuth 2.0)
      row.realm_id,
      USE_SANDBOX,
      false, // debug
      null, // minor version
      '2.0', // OAuth version
      row.refresh_token
    );

    next();
  } catch (err) {
    console.error('requireQuickBooks error:', err);
    res.status(500).json({ error: 'QuickBooks authorization failed' });
  }
}
