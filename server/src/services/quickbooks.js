/**
 * QuickBooks Online integration.
 *
 * Until OAuth credentials are present in the environment, every function falls
 * back to realistic mock data so the dashboard works end-to-end. Replace the
 * mock branches with real QBO API calls when you're ready.
 *
 * Real integration outline:
 *   1. OAuth 2.0 — exchange the stored refresh token for an access token
 *      (POST https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer).
 *   2. Query the Accounting API with the access token + realm (company) id, e.g.
 *      GET {base}/v3/company/{realmId}/query?query=SELECT * FROM Invoice ...
 *   3. Map the responses into the shape returned below.
 */

export function isQuickBooksConfigured() {
  return Boolean(
    process.env.QBO_CLIENT_ID &&
      process.env.QBO_CLIENT_SECRET &&
      process.env.QBO_REFRESH_TOKEN &&
      process.env.QBO_REALM_ID
  );
}

// --- Real API access token (stub) ----------------------------------------
// async function getAccessToken() {
//   const auth = Buffer.from(
//     `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
//   ).toString('base64');
//   const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
//     method: 'POST',
//     headers: {
//       Authorization: `Basic ${auth}`,
//       'Content-Type': 'application/x-www-form-urlencoded',
//       Accept: 'application/json',
//     },
//     body: new URLSearchParams({
//       grant_type: 'refresh_token',
//       refresh_token: process.env.QBO_REFRESH_TOKEN,
//     }),
//   });
//   if (!res.ok) throw new Error(`QBO token refresh failed (${res.status})`);
//   return res.json(); // { access_token, refresh_token, ... }
// }

/**
 * Returns the raw financial figures for a given app user.
 * @param {string} userId - Supabase user id (will scope the QBO company later).
 */
export async function getFinancials(userId) {
  if (!isQuickBooksConfigured()) {
    return { source: 'mock', ...mockFinancials() };
  }

  // TODO: real QuickBooks calls go here.
  //   const { access_token } = await getAccessToken();
  //   const invoices = await qboQuery(access_token, 'SELECT * FROM Invoice WHERE Balance > 0');
  //   ...map and return { source: 'quickbooks', ... }
  return { source: 'mock', ...mockFinancials() };
}

// --- Mock data ------------------------------------------------------------
function mockFinancials() {
  const jobs = [
    { id: 'j1', name: 'Maple St. Kitchen Remodel', revenue: 48000, cost: 33600 },
    { id: 'j2', name: 'Riverside Deck Build', revenue: 22000, cost: 19800 },
    { id: 'j3', name: 'Oakwood Bathroom Reno', revenue: 31500, cost: 21000 },
    { id: 'j4', name: 'Downtown Office Buildout', revenue: 96000, cost: 84000 },
  ];

  return {
    cashOnHand: 42850,
    cashTrend: 8.4, // % vs last month
    outstandingInvoices: 27600,
    openInvoiceCount: 6,
    jobs,
  };
}
