import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStripe } from '../services/stripe.js';
import {
  getOrCreateSubscription,
  getPlan,
  setCustomerId,
  updateByUser,
  updateByCustomer,
} from '../services/subscriptions.js';

const router = Router();

// Absolute app origin for Stripe redirect URLs (must be absolute).
function appOrigin(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.get('host')}`;
}

function periodEndIso(sub) {
  return sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
}

// GET /api/billing/plan — { plan: 'trial' | 'pro' | 'solo' } for the current user.
router.get('/billing/plan', requireAuth, async (req, res) => {
  try {
    res.json({ plan: await getPlan(req.user.id) });
  } catch (err) {
    console.error('Billing plan error:', err);
    res.status(500).json({ error: 'Failed to load plan' });
  }
});

// GET /api/billing/status — current subscription (creates a 14-day trial on first call).
router.get('/billing/status', requireAuth, async (req, res) => {
  try {
    res.json(await getOrCreateSubscription(req.user.id));
  } catch (err) {
    console.error('Billing status error:', err);
    res.status(500).json({ error: 'Failed to load subscription status' });
  }
});

// POST /api/billing/checkout — Stripe Checkout session for Pro ($29/mo). Returns { url }.
router.post('/billing/checkout', requireAuth, async (req, res) => {
  try {
    const plan = req.body?.plan === 'pro' ? 'pro' : 'solo';
    const priceId = (
      plan === 'pro'
        ? process.env.STRIPE_PRICE_ID_PRO
        : process.env.STRIPE_PRICE_ID_SOLO || process.env.STRIPE_PRICE_ID
    )?.trim();
    if (!priceId) {
      return res.status(503).json({ error: 'Billing is not configured yet.' });
    }
    const stripe = getStripe();
    const userId = req.user.id;
    const sub = await getOrCreateSubscription(userId);

    // Reuse the Stripe customer if we have one, otherwise create it.
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await setCustomerId(userId, customerId);
    }

    const origin = appOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      subscription_data: { metadata: { user_id: userId, plan } },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?subscribed=true`,
      cancel_url: `${origin}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Billing checkout error:', err);
    res.status(500).json({ error: 'Could not start checkout. Try again.' });
  }
});

// POST /api/billing/portal — Stripe Customer Portal to manage/cancel. Returns { url }.
router.post('/billing/portal', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    const sub = await getOrCreateSubscription(req.user.id);
    if (!sub.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account yet — upgrade first.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appOrigin(req)}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Billing portal error:', err);
    res.status(500).json({ error: 'Could not open the billing portal. Try again.' });
  }
});

// POST /api/billing/webhook — raw body (mounted before express.json in index.js).
export async function webhookHandler(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return res.status(503).send('Webhook not configured');

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const stripe = getStripe();
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        const userId = s.client_reference_id;
        const sub = s.subscription ? await stripe.subscriptions.retrieve(s.subscription) : null;
        if (userId) {
          await updateByUser(userId, {
            stripe_customer_id: s.customer || undefined,
            stripe_subscription_id: s.subscription || undefined,
            plan: sub?.metadata?.plan || 'solo',
            status: sub?.status || 'active',
            current_period_ends_at: periodEndIso(sub),
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const active = ['active', 'trialing', 'past_due'].includes(sub.status);
        await updateByCustomer(sub.customer, {
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan: active ? sub.metadata?.plan || 'pro' : 'free',
          current_period_ends_at: periodEndIso(sub),
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateByCustomer(sub.customer, { status: 'canceled', plan: 'free' });
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
