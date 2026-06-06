import { supabaseAdmin } from '../supabase.js';

// Manual jobs live in Supabase (not QuickBooks). All access is scoped to the
// signed-in user via user_id; the service-role client bypasses RLS.

export async function listManualJobs(userId) {
  const { data, error } = await supabaseAdmin
    .from('manual_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((j) => ({
    id: j.id,
    name: j.name,
    customer: j.customer,
    contract: Number(j.contract_amount) || 0,
    createdAt: j.created_at,
  }));
}

export async function createManualJob(userId, { name, customer, contractAmount }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Give the job a name.');

  const { data, error } = await supabaseAdmin
    .from('manual_jobs')
    .insert({
      user_id: userId,
      name: trimmed,
      customer: customer ? String(customer).trim() : null,
      contract_amount: Number(contractAmount) || 0,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    customer: data.customer,
    contract: Number(data.contract_amount) || 0,
  };
}

export async function deleteManualJob(userId, id) {
  const { error } = await supabaseAdmin
    .from('manual_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw error;
  return { deleted: true };
}
