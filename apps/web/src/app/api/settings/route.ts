import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

const BodySchema = z.object({
  isPublic: z.boolean().optional(),
  theme: z.enum(['orange', 'green', 'blue', 'purple']).optional(),
  primaryMetric: z.enum(['messages', 'sessions', 'tokens']).optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
  const { isPublic, theme, primaryMetric } = parsed.data;

  // Gate: making a page public requires payment. Free users may toggle OFF but
  // not ON. (Enforced here so the API is the source of truth, not just the UI.)
  if (isPublic === true && !user.isPaid) {
    return NextResponse.json(
      { error: 'Publishing requires a one-time upgrade.', code: 'payment_required' },
      { status: 402 },
    );
  }

  await db
    .update(schema.users)
    .set({
      ...(isPublic !== undefined ? { isPublic } : {}),
      ...(theme ? { theme } : {}),
      ...(primaryMetric ? { primaryMetric } : {}),
    })
    .where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true });
}
