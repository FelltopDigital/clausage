import { cookies } from 'next/headers';
import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';
import { env } from '../env';
import { hmacSign, safeEqual } from './crypto';
import type { User } from '../db/schema';

const COOKIE = 'clusage_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Stateless signed-cookie session: base64url(payload).hmac */
function encode(userId: string, expMs: number): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: expMs })).toString('base64url');
  return `${payload}.${hmacSign(payload, env.AUTH_SECRET)}`;
}

function decode(value: string): { uid: string; exp: number } | null {
  const dot = value.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!safeEqual(sig, hmacSign(payload, env.AUTH_SECRET))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof obj.uid === 'string' && typeof obj.exp === 'number') return obj;
  } catch {
    /* fall through */
  }
  return null;
}

export async function createSession(userId: string): Promise<void> {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const jar = await cookies();
  jar.set(COOKIE, encode(userId, exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the current user id from a valid, unexpired session cookie. */
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const decoded = decode(raw);
  if (!decoded || decoded.exp < Date.now()) return null;
  return decoded.uid;
}

/** Loads the full current user (or null). */
export async function getCurrentUser(): Promise<User | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  return rows[0] ?? null;
}
