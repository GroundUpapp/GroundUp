import { Resend } from 'resend';
import { supabaseAdmin } from '../supabase.js';

// Lazy Resend client so a missing key never crashes the function at import.
let client = null;
function getResend() {
  if (client) return client;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('Resend is not configured (RESEND_API_KEY missing).');
  client = new Resend(key);
  return client;
}

// Default to Resend's shared test sender (works without a verified domain, but
// only delivers to the account owner). Set RESEND_FROM to a verified domain for
// real delivery, e.g. "Ground Up <reports@raftasfinancialgroup.com>".
function from() {
  return process.env.RESEND_FROM?.trim() || 'Ground Up <onboarding@resend.dev>';
}

export async function sendEmail({ to, subject, html }) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({ from: from(), to, subject, html });
  if (error) throw new Error(error.message || 'Resend send failed');
  return data;
}

/** All users with a connected QuickBooks company, resolved to { userId, email }. */
export async function listConnectedRecipients() {
  const { data, error } = await supabaseAdmin.from('quickbooks_tokens').select('user_id');
  if (error) throw error;

  const recipients = [];
  for (const { user_id } of data || []) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (u?.user?.email) recipients.push({ userId: user_id, email: u.user.email });
  }
  return recipients;
}
