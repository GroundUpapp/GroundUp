import { createClient } from '@supabase/supabase-js';

// Lazily construct the admin client on first use. Creating it at import time
// would throw ("supabaseUrl is required") when env vars are missing, crashing
// the ENTIRE serverless function — including routes that don't touch Supabase.
// Deferring means a misconfiguration surfaces as a clean per-request error.
let client = null;

function getClient() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        'in the environment (e.g. Vercel Project Settings → Environment Variables).'
    );
  }

  client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

// Proxy so existing call sites (`supabaseAdmin.auth.getUser`, `supabaseAdmin.from`)
// keep working unchanged, while the real client is created on first property access.
export const supabaseAdmin = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getClient();
      const value = real[prop];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  }
);
