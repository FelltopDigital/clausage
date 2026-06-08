import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getCurrentUser } from '@/lib/session';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { env } from '@/env';

export const runtime = 'nodejs';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (user.isPaid) return NextResponse.json({ error: 'Already upgraded' }, { status: 400 });

  if (!stripeConfigured) {
    return NextResponse.json(
      { error: 'Payments are not configured on this deployment yet.' },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const base = env.APP_URL.replace(/\/$/, '');

  // Reuse the customer if we have one, else let Checkout create it.
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(schema.users)
      .set({ stripeCustomerId: customerId })
      .where(eq(schema.users.id, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: user.id,
    metadata: { userId: user.id },
    line_items: [{ price: env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${base}/dashboard?upgraded=1`,
    cancel_url: `${base}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
