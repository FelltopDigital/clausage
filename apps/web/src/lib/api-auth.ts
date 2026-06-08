import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';
import { sha256hex } from './crypto';
import type { User } from '../db/schema';

export interface AuthedToken {
  user: User;
  tokenId: string;
}

/**
 * Authenticate a `Authorization: Bearer clst_...` header against api_tokens.
 * Returns the owning user, or null if missing/invalid. Also touches
 * last_used_at as a side effect on success.
 */
export async function authenticateBearer(req: Request): Promise<AuthedToken | null> {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(clst_[A-Za-z0-9_-]+)$/.exec(header.trim());
  if (!match) return null;
  const token = match[1]!;
  const hash = sha256hex(token);

  const rows = await db
    .select({ token: schema.apiTokens, user: schema.users })
    .from(schema.apiTokens)
    .innerJoin(schema.users, eq(schema.apiTokens.userId, schema.users.id))
    .where(eq(schema.apiTokens.tokenHash, hash))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db
    .update(schema.apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiTokens.id, row.token.id));

  return { user: row.user, tokenId: row.token.id };
}
