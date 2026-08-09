import Stripe from 'stripe';

let stripeClient;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    const error = new Error('Subscriptions are not configured yet.');
    error.status = 503;
    throw error;
  }

  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}
