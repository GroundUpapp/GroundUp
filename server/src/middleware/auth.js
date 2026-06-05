import { supabaseAdmin } from '../supabase.js';

// Resolves a Supabase access token to a user, or null if missing/invalid.
// Used by the OAuth routes, which receive the token as a query param because
// full-page redirects can't carry an Authorization header.
export async function authenticateToken(token) {
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Verifies the Supabase access token from the Authorization header and
// attaches the resolved user to req.user.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    const user = await authenticateToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication check failed' });
  }
}
