import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index';

/**
 * Grant paid status to a user. Idempotent: setting is_paid=true repeatedly is a
 * no-op, so replayed webhooks are safe. Returns true if a user was matched.
 */
export async function fulfillPurchase(
  userId: string,
  stripeCustomerId?: string | null,
): Promise<boolean> {
  const rows = await db
    .update(schema.users)
    .set({
      isPaid: true,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    })
    .where(eq(schema.users.id, userId))
    .returning({ id: schema.users.id });
  return rows.length > 0;
}

/** Minimal shape of the Stripe events we act on (kept narrow + testable). */
export interface MinimalStripeEvent {
  type: string;
  data: {
    object: {
      client_reference_id?: string | null;
      customer?: string | null;
      metadata?: Record<string, string> | null;
      payment_status?: string | null;
    };
  };
}

/**
 * Handle a verified Stripe event. Only acts on a completed/paid checkout.
 * Returns whether the event resulted in fulfillment. Idempotent.
 */
export async function handleStripeEvent(event: MinimalStripeEvent): Promise<boolean> {
  if (event.type !== 'checkout.session.completed') return false;
  const obj = event.data.object;
  // For one-time payments, ensure it's actually paid.
  if (obj.payment_status && obj.payment_status !== 'paid') return false;

  const userId = obj.client_reference_id ?? obj.metadata?.userId ?? null;
  if (!userId) return false;

  return fulfillPurchase(userId, obj.customer ?? null);
}
