import { supabaseAdmin } from '../supabase.js';

// Dedup helpers for the `alerts` table. reference_id is always a non-null string
// (use '' for account-wide alerts) so the unique constraint actually dedupes.

export async function hasAlert(userId, alertType, referenceId = '') {
  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('alert_type', alertType)
    .eq('reference_id', referenceId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function recordAlert(userId, alertType, referenceId = '') {
  const { error } = await supabaseAdmin
    .from('alerts')
    .insert({ user_id: userId, alert_type: alertType, reference_id: referenceId });
  // 23505 = unique violation (already recorded) — safe to ignore.
  if (error && error.code !== '23505') throw error;
}
