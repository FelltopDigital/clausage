import { NextResponse } from 'next/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { env } from '@/env';
import { sha256hex } from '@/lib/crypto';
import { createSession } from '@/lib/session';

export const runtime = 'nodejs';

function redirect(path: string) {
  return NextResponse.redirect(`${env.APP_URL.replace(/\/$/, '')}${path}`);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return redirect('/login?error=missing');

  const hash = sha256hex(token);
  const now = new Date();

  // Valid = matching hash, unused, unexpired.
  const links = await db
    .select()
    .from(schema.magicLinks)
    .where(
      and(
        eq(schema.magicLinks.tokenHash, hash),
        isNull(schema.magicLinks.usedAt),
        gt(schema.magicLinks.expiresAt, now),
      ),
    )
    .limit(1);

  const link = links[0];
  if (!link) return redirect('/login?error=expired');

  // Single-use: mark consumed.
  await db
    .update(schema.magicLinks)
    .set({ usedAt: now })
    .where(eq(schema.magicLinks.id, link.id));

  // Find or create the user by email.
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, link.email))
    .limit(1);

  let user = existing[0];
  if (!user) {
    const inserted = await db
      .insert(schema.users)
      .values({ email: link.email })
      .returning();
    user = inserted[0]!;
  }

  await createSession(user.id);

  return redirect(user.username ? '/dashboard' : '/onboarding');
}
