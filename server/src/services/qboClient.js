import QuickBooks from 'node-quickbooks';
import { getTokenRow, saveTokenRow } from './quickbooksTokens.js';
import { refreshAccessToken, USE_SANDBOX } from './intuit.js';

/**
 * Build a ready node-quickbooks client for a user, refreshing the access token
 * when it's expired (or about to be). Returns null if the user hasn't connected
 * QuickBooks. Used by both the requireQuickBooks middleware and the cron jobs.
 */
export async function getQboClient(userId) {
  let row = await getTokenRow(userId);
  if (!row) return null;

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

  const qbo = new QuickBooks(
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

  return { qbo, realmId: row.realm_id, row };
}
