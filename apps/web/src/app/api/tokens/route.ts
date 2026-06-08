import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getSessionUserId } from '@/lib/session';
import { mintApiToken } from '@/lib/crypto';

export const runtime = 'nodejs';

const CreateSchema = z.object({ label: z.string().max(64).optional() });

/** List the signed-in user's tokens (prefix + metadata only — never the secret). */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const rows = await db
    .select({
      id: schema.apiTokens.id,
      prefix: schema.apiTokens.prefix,
      label: schema.apiTokens.label,
      lastUsedAt: schema.apiTokens.lastUsedAt,
      createdAt: schema.apiTokens.createdAt,
    })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, userId))
    .orderBy(desc(schema.apiTokens.createdAt));

  return NextResponse.json({ tokens: rows });
}

/** Mint a new token. The plaintext is returned exactly once. */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let label: string | undefined;
  try {
    const body = await req.json();
    label = CreateSchema.parse(body ?? {}).label;
  } catch {
    label = undefined;
  }

  const { token, hash, prefix } = mintApiToken();
  const inserted = await db
    .insert(schema.apiTokens)
    .values({ userId, tokenHash: hash, prefix, label: label ?? 'CLI token' })
    .returning({ id: schema.apiTokens.id });

  return NextResponse.json({ id: inserted[0]!.id, token, prefix });
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let id: string;
  try {
    id = DeleteSchema.parse(await req.json()).id;
  } catch {
    return NextResponse.json({ error: 'token id required' }, { status: 400 });
  }

  await db
    .delete(schema.apiTokens)
    .where(and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.userId, userId)));
  return NextResponse.json({ ok: true });
}
