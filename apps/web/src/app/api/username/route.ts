import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getSessionUserId } from '@/lib/session';
import { validateUsernameShape, isUsernameAvailable } from '@/lib/username';

export const runtime = 'nodejs';

const BodySchema = z.object({ username: z.string() });

/** Live availability check (used by the onboarding form). */
export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get('username') ?? '';
  const shape = validateUsernameShape(username);
  if (!shape.ok) return NextResponse.json({ available: false, error: shape.error });
  const available = await isUsernameAvailable(username);
  return NextResponse.json({ available, error: available ? undefined : 'Already taken' });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'username required' }, { status: 400 });

  const username = parsed.data.username.trim().toLowerCase();
  const shape = validateUsernameShape(username);
  if (!shape.ok) return NextResponse.json({ error: shape.error }, { status: 400 });

  if (!(await isUsernameAvailable(username, userId))) {
    return NextResponse.json({ error: 'That username is already taken' }, { status: 409 });
  }

  await db.update(schema.users).set({ username }).where(eq(schema.users.id, userId));
  return NextResponse.json({ ok: true, username });
}
