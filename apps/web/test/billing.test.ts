import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { fulfillPurchase, handleStripeEvent } from '@/lib/billing';

let userId: string;

beforeAll(async () => {
  const inserted = await db
    .insert(schema.users)
    .values({ email: 'pay-test@example.com', username: 'paytester', isPaid: false })
    .returning();
  userId = inserted[0]!.id;
});

async function isPaid(): Promise<boolean> {
  const r = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return r[0]!.isPaid;
}

describe('payment fulfillment + webhook', () => {
  it('starts unpaid', async () => {
    expect(await isPaid()).toBe(false);
  });

  it('checkout.session.completed flips is_paid and stores the customer', async () => {
    const handled = await handleStripeEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: userId,
          customer: 'cus_test123',
          payment_status: 'paid',
        },
      },
    });
    expect(handled).toBe(true);
    expect(await isPaid()).toBe(true);

    const r = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    expect(r[0]!.stripeCustomerId).toBe('cus_test123');
  });

  it('is idempotent — replaying the event keeps is_paid true', async () => {
    await handleStripeEvent({
      type: 'checkout.session.completed',
      data: { object: { client_reference_id: userId, customer: 'cus_test123', payment_status: 'paid' } },
    });
    expect(await isPaid()).toBe(true);
  });

  it('ignores unrelated events and unpaid sessions', async () => {
    expect(
      await handleStripeEvent({ type: 'payment_intent.created', data: { object: {} } }),
    ).toBe(false);
    expect(
      await handleStripeEvent({
        type: 'checkout.session.completed',
        data: { object: { client_reference_id: userId, payment_status: 'unpaid' } },
      }),
    ).toBe(false);
  });

  it('fulfillPurchase returns false for an unknown user', async () => {
    expect(await fulfillPurchase('00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});
