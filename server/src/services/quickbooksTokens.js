import { supabaseAdmin } from '../supabase.js';

// CRUD helpers for the quickbooks_tokens table
// (columns: user_id, access_token, refresh_token, realm_id, expires_at).

export async function getTokenRow(userId) {
  const { data, error } = await supabaseAdmin
    .from('quickbooks_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null when not connected
}

export async function saveTokenRow(userId, { access_token, refresh_token, realm_id, expires_at }) {
  const { error } = await supabaseAdmin
    .from('quickbooks_tokens')
    .upsert(
      { user_id: userId, access_token, refresh_token, realm_id, expires_at },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function deleteTokenRow(userId) {
  const { error } = await supabaseAdmin
    .from('quickbooks_tokens')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
