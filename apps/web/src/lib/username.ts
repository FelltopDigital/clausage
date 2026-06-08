import { UsernameSchema } from '@clusage/shared';
import { db, schema } from '../db/index';
import { and, eq, ne } from 'drizzle-orm';

/** Routes/words that must not become usernames (would shadow real paths). */
const RESERVED = new Set([
  'admin',
  'api',
  'dashboard',
  'login',
  'logout',
  'onboarding',
  'u',
  'settings',
  'billing',
  'pricing',
  'about',
  'terms',
  'privacy',
  'help',
  'support',
  'www',
  'clusage',
]);

export interface UsernameCheck {
  ok: boolean;
  error?: string;
}

export function validateUsernameShape(raw: string): UsernameCheck {
  const value = raw.trim().toLowerCase();
  const parsed = UsernameSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid username' };
  }
  if (RESERVED.has(value)) return { ok: false, error: 'That username is reserved' };
  return { ok: true };
}

/** True if the username is free (optionally excluding one user id). */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const value = username.trim().toLowerCase();
  const where = excludeUserId
    ? and(eq(schema.users.username, value), ne(schema.users.id, excludeUserId))
    : eq(schema.users.username, value);
  const rows = await db.select({ id: schema.users.id }).from(schema.users).where(where).limit(1);
  return rows.length === 0;
}
