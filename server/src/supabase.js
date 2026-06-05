import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    '[Ground Up] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. ' +
      'Token verification will fail until server/.env is configured.'
  );
}

// Admin client — used server-side to verify access tokens and (later) read data.
export const supabaseAdmin = createClient(url ?? '', serviceKey ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
});
