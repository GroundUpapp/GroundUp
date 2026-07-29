import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  // Surface this loudly in dev — auth won't work without it.
  console.warn(
    '[Ground Up] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copy client/.env.example to client/.env and fill in your Supabase values.'
  );
}

export const supabase = createClient(url ?? '', publishableKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
