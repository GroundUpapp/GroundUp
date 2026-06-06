import Stripe from 'stripe';

// Lazy init so a missing key surfaces as a clean per-request error instead of
// crashing the whole serverless function at import (same approach as supabase.js).
let client = null;

export function getStripe() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
  }
  client = new Stripe(key);
  return client;
}
