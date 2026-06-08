import Stripe from 'stripe';
import { env, stripeConfigured } from '../env';

let client: Stripe | null = null;

/** Lazily construct the Stripe client. Throws if Stripe isn't configured. */
export function getStripe(): Stripe {
  if (!stripeConfigured) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY etc. See SETUP.md.');
  }
  if (!client) {
    // Use the SDK's pinned API version (avoids drift between lib + literal type).
    client = new Stripe(env.STRIPE_SECRET_KEY!);
  }
  return client;
}

export { stripeConfigured };
