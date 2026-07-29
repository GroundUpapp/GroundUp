import crypto from 'node:crypto';
import OAuthClient from 'intuit-oauth';

const {
  QUICKBOOKS_CLIENT_ID,
  QUICKBOOKS_CLIENT_SECRET,
  QUICKBOOKS_REDIRECT_URI,
  QUICKBOOKS_ENVIRONMENT,
} = process.env;

// node-quickbooks needs a boolean; production env => live API.
export const USE_SANDBOX = (QUICKBOOKS_ENVIRONMENT || 'production') !== 'production';

export function isQuickBooksOAuthConfigured() {
  return Boolean(
    QUICKBOOKS_CLIENT_ID && QUICKBOOKS_CLIENT_SECRET && QUICKBOOKS_REDIRECT_URI
  );
}

function getOAuthClient() {
  return new OAuthClient({
    clientId: QUICKBOOKS_CLIENT_ID,
    clientSecret: QUICKBOOKS_CLIENT_SECRET,
    environment: QUICKBOOKS_ENVIRONMENT || 'production',
    redirectUri: QUICKBOOKS_REDIRECT_URI,
  });
}

// Builds the Intuit authorization URL the user is redirected to.
export function buildAuthorizeUri(state) {
  return getOAuthClient().authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state,
  });
}

// Exchanges the authorization-code callback URL for a token set.
export async function exchangeCodeForTokens(callbackUrl) {
  const authResponse = await getOAuthClient().createToken(callbackUrl);
  return authResponse.getJson(); // { access_token, refresh_token, expires_in, ... }
}

// Uses a refresh token to mint a fresh access token.
export async function refreshAccessToken(refreshToken) {
  const authResponse = await getOAuthClient().refreshUsingToken(refreshToken);
  return authResponse.getJson();
}

// --- OAuth state (CSRF protection + carries the user id across redirects) ---
// The full-page OAuth redirect can't send our Supabase session, so we embed the
// user id in a signed `state` value and verify the signature on the callback.
// A missing secret would let anyone forge `state` and impersonate a user on
// connect, so we fail fast — but lazily, inside getStateSecret(), so that one
// missing env var can't crash the whole bundle at module load (see supabase.js).
function getStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('OAUTH_STATE_SECRET is required to sign QuickBooks OAuth state.');
  }
  return secret;
}

export function signState(userId) {
  const secret = getStateSecret();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${userId}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyState(state) {
  try {
    const secret = getStateSecret();
    const decoded = Buffer.from(String(state), 'base64url').toString('utf8');
    const [userId, nonce, sig] = decoded.split('.');
    if (!userId || !nonce || !sig) return null;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${userId}.${nonce}`)
      .digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}
