import express from 'express';
import User from '../../db/models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getStripe } from '../services/stripeClient.js';
import { hasPlusAccess, isPlannerPlusAvailable, serializeUser } from '../services/userAccess.js';
import { requireAuth, requireSelf } from '../middleware/requireAuth.js';

const router = express.Router();

router.use(requireAuth);

function appUrl() {
  return (process.env.APP_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '');
}

function getId(value) {
  return typeof value === 'string' ? value : value?.id;
}

function getPeriodEnd(subscription) {
  const topLevel = subscription?.current_period_end;
  const itemEnds = subscription?.items?.data
    ?.map((item) => item.current_period_end)
    .filter(Number.isFinite);
  const timestamp = topLevel ?? (itemEnds?.length ? Math.max(...itemEnds) : null);
  return timestamp ? new Date(timestamp * 1000) : null;
}

function normalizeStatus(status) {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return status;
  if (status === 'canceled') return 'canceled';
  return 'inactive';
}

async function syncSubscription(subscription, fallbackUserId) {
  const stripeCustomerId = getId(subscription.customer);
  const userId = subscription.metadata?.userId || fallbackUserId;
  const query = userId
    ? { _id: userId }
    : {
        $or: [
          { stripeSubscriptionId: subscription.id },
          ...(stripeCustomerId ? [{ stripeCustomerId }] : [])
        ]
      };
  const active = ['active', 'trialing'].includes(subscription.status);

  return User.findOneAndUpdate(
    query,
    {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      subscription: {
        plan: active ? 'plus' : 'free',
        status: normalizeStatus(subscription.status),
        startedAt: subscription.start_date ? new Date(subscription.start_date * 1000) : undefined,
        currentPeriodEnd: getPeriodEnd(subscription)
      }
    },
    { returnDocument: 'after' }
  );
}

router.post('/checkout', asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId).select('+stripeCustomerId');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!isPlannerPlusAvailable()) {
    return res.status(503).json({ message: 'Planner Plus is coming soon. Billing is not open yet.' });
  }
  if (hasPlusAccess(user)) {
    return res.status(409).json({ message: 'Planner Plus is already active for this account' });
  }

  const priceId = process.env.STRIPE_PLUS_PRICE_ID?.trim();
  if (!priceId) return res.status(503).json({ message: 'Subscriptions are not configured yet.' });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: String(user._id),
    metadata: { userId: String(user._id) },
    subscription_data: { metadata: { userId: String(user._id) } },
    success_url: `${appUrl()}/subscription?checkout=success`,
    cancel_url: `${appUrl()}/subscription?checkout=canceled`,
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : {})
  });

  res.json({ url: session.url });
}));

router.post('/portal', asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.userId).select('+stripeCustomerId');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.stripeCustomerId) {
    return res.status(400).json({ message: 'No subscription billing account was found' });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/subscription`
  });
  res.json({ url: session.url });
}));

router.get('/status/:userId', requireSelf, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(serializeUser(user));
}));

export async function handleStripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) return res.status(503).json({ message: 'Stripe webhook is not configured' });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subscriptionId = getId(session.subscription);
      if (subscriptionId) {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        await syncSubscription(subscription, session.metadata?.userId || session.client_reference_id);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await syncSubscription(event.data.object);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook sync failed:', error);
    res.status(500).json({ message: 'Could not sync subscription' });
  }
}

export default router;
