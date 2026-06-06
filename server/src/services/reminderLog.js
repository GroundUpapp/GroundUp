import { supabaseAdmin } from '../supabase.js';

const SEVEN_DAYS_MS = 7 * 86_400_000;

export async function remindedWithin7Days(userId, invoiceId) {
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('reminder_log')
    .select('id')
    .eq('user_id', userId)
    .eq('invoice_id', String(invoiceId))
    .gte('sent_at', since)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function logReminder(userId, invoiceId, customer) {
  const { error } = await supabaseAdmin
    .from('reminder_log')
    .insert({ user_id: userId, invoice_id: String(invoiceId), customer: customer || null });
  if (error) throw error;
}
