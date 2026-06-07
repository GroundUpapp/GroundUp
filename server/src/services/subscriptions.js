import { supabaseAdmin } from '../supabase.js';

const TRIAL_DAYS = 14;
const DAY_MS = 86_400_000;

function shape(row) {
  if (!row) return null;
  const now = Date.now();
  const trialEnds = row.trial_ends_at ? Date.parse(row.trial_ends_at) : null;
  const onTrial = row.status === 'trialing' && trialEnds && trialEnds > now;
  const access = row.status === 'active' || onTrial;
  return {
    plan: row.plan,
    status: row.status,
    access,
    trialing: onTrial,
    trialDaysLeft: onTrial ? Math.max(0, Math.ceil((trialEnds - now) / DAY_MS)) : 0,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEndsAt: row.current_period_ends_at,
    hasCustomer: !!row.stripe_customer_id,
    stripeCustomerId: row.stripe_customer_id || null,
  };
}

// Fetch the user's row, creating a 14-day free trial on first access.
export async function getOrCreateSubscription(userId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return shape(data);

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
  const { data: created, error: insErr } = await supabaseAdmin
    .from('subscriptions')
    .insert({ user_id: userId, plan: 'free', status: 'trialing', trial_ends_at: trialEndsAt })
    .select()
    .single();
  if (insErr) {
    // Race: another request created it first — re-read.
    if (insErr.code === '23505') return getOrCreateSubscription(userId);
    throw insErr;
  }
  return shape(created);
}

// Returns 'trial' | 'pro' | 'solo'. Trial users get full Pro access during the
// 14-day window, so they resolve to 'trial' (treated as Pro by hasProAccess).
export async function getPlan(userId) {
  const sub = await getOrCreateSubscription(userId);
  if (sub.trialing) return 'trial';
  if (sub.status === 'active') return sub.plan === 'pro' ? 'pro' : 'solo';
  return 'solo';
}

export function hasProAccess(plan) {
  return plan === 'pro' || plan === 'trial';
}

export async function setCustomerId(userId, stripeCustomerId) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateByUser(userId, patch) {
  const { error } = await supabaseAdmin.from('subscriptions').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function updateByCustomer(stripeCustomerId, patch) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(patch)
    .eq('stripe_customer_id', stripeCustomerId);
  if (error) throw error;
}
