import { Router } from 'express';
import { requireAuth, authenticateToken } from '../middleware/auth.js';
import {
  buildAuthorizeUri,
  exchangeCodeForTokens,
  signState,
  verifyState,
} from '../services/intuit.js';
import {
  getTokenRow,
  saveTokenRow,
  deleteTokenRow,
} from '../services/quickbooksTokens.js';

const router = Router();

// Where to send the browser after the OAuth round-trip. On Vercel the API and
// app share an origin, so a relative path works; override with APP_BASE_URL.
const APP_BASE = process.env.APP_BASE_URL || '';

// 1. Start the OAuth flow. Reached via top-level navigation, so the Supabase
//    token comes in as a query param rather than an Authorization header.
router.get('/auth/quickbooks', async (req, res) => {
  try {
    const user = await authenticateToken(req.query.token);
    if (!user) {
      return res.status(401).json({ error: 'Missing or invalid access token' });
    }
    const state = signState(user.id);
    res.redirect(buildAuthorizeUri(state));
  } catch (err) {
    console.error('QuickBooks authorize error:', err);
    res.status(500).json({ error: 'Failed to start QuickBooks authorization' });
  }
});

// 2. OAuth callback — exchange the code for tokens and store them.
router.get('/auth/quickbooks/callback', async (req, res) => {
  try {
    const userId = verifyState(req.query.state);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const token = await exchangeCodeForTokens(req.url);
    const expires_at = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await saveTokenRow(userId, {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      realm_id: req.query.realmId,
      expires_at,
    });

    res.redirect(`${APP_BASE}/dashboard?quickbooks=connected`);
  } catch (err) {
    console.error('QuickBooks callback error:', err);
    res.redirect(`${APP_BASE}/dashboard?quickbooks=error`);
  }
});

// 3. Disconnect — delete the stored tokens. Also reached via navigation.
router.get('/auth/quickbooks/disconnect', async (req, res) => {
  try {
    const user = await authenticateToken(req.query.token);
    if (!user) {
      return res.status(401).json({ error: 'Missing or invalid access token' });
    }
    await deleteTokenRow(user.id);
    res.redirect(`${APP_BASE}/dashboard?quickbooks=disconnected`);
  } catch (err) {
    console.error('QuickBooks disconnect error:', err);
    res.redirect(`${APP_BASE}/dashboard?quickbooks=error`);
  }
});

// 4. Connection status — normal authenticated fetch from the SPA.
router.get('/auth/quickbooks/status', requireAuth, async (req, res) => {
  try {
    const row = await getTokenRow(req.user.id);
    res.json({ connected: Boolean(row) });
  } catch (err) {
    console.error('QuickBooks status error:', err);
    res.status(500).json({ error: 'Failed to check QuickBooks status' });
  }
});

export default router;
