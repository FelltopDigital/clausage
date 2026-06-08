import { NextResponse } from 'next/server';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { handleStripeEvent } from '@/lib/billing';
import { env } from '@/env';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const raw = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    await handleStripeEvent(event as never);
  } catch (err) {
    // Return 500 so Stripe retries; fulfillment is idempotent so retries are safe.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
