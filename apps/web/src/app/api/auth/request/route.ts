import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/db/index';
import { env } from '@/env';
import { randomHex, sha256hex } from '@/lib/crypto';
import { sendMagicLink } from '@/lib/email';

export const runtime = 'nodejs';

const BodySchema = z.object({ email: z.string().email() });
const LINK_TTL_MINUTES = 15;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60_000);
  await db.insert(schema.magicLinks).values({
    email,
    tokenHash: sha256hex(token),
    expiresAt,
  });

  const url = `${env.APP_URL.replace(/\/$/, '')}/api/auth/callback?token=${token}`;
  await sendMagicLink(email, url);

  // Don't reveal whether the email exists; always report sent.
  return NextResponse.json({ ok: true });
}
