import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL || ''; // '' -> Vite dev proxy

/**
 * Authenticated fetch against the backend. Attaches the current Supabase
 * access token as a Bearer credential so the server can verify the user.
 */
export async function apiGet(path) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${BASE}/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}
