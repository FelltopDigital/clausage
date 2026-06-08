import { describe, it, expect, beforeAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { SyncPayload } from '@clausage/shared';
import { db, schema } from '@/db/index.js';
import { mintApiToken } from '@/lib/crypto.js';
import { POST as syncPost } from '@/app/api/sync/route.js';

let token: string;
let userId: string;

beforeAll(async () => {
  const inserted = await db
    .insert(schema.users)
    .values({ email: 'sync-test@example.com', username: 'synctester' })
    .returning();
  userId = inserted[0]!.id;

  const minted = mintApiToken();
  token = minted.token;
  await db
    .insert(schema.apiTokens)
    .values({ userId, tokenHash: minted.hash, prefix: minted.prefix, label: 'test' });
});

function makeReq(payload: unknown, auth?: string): Request {
  return new Request('http://localhost:3000/api/sync', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(payload),
  });
}

const payload: SyncPayload = {
  machineId: 'machine_testabcd1234',
  cliVersion: '0.1.0',
  days: [
    { date: '2026-06-01', messages: 10, sessions: 2, inputTokens: 1000, outputTokens: 200, projects: 1 },
    { date: '2026-06-02', messages: 5, sessions: 1, inputTokens: 500, outputTokens: 80, projects: 2 },
  ],
};

async function rowCount(): Promise<number> {
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.dailyUsage)
    .where(eq(schema.dailyUsage.userId, userId));
  return r[0]!.n;
}

describe('POST /api/sync', () => {
  it('rejects requests without a valid bearer token', async () => {
    const res = await syncPost(makeReq(payload));
    expect(res.status).toBe(401);
  });

  it('rejects malformed payloads with 422', async () => {
    const res = await syncPost(makeReq({ machineId: 'x', cliVersion: '1', days: 'nope' }, `Bearer ${token}`));
    expect(res.status).toBe(422);
  });

  it('upserts daily usage on first sync', async () => {
    const res = await syncPost(makeReq(payload, `Bearer ${token}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.daysUpserted).toBe(2);
    expect(json.username).toBe('synctester');
    expect(await rowCount()).toBe(2);
  });

  it('is idempotent — re-running keeps row count stable and values correct', async () => {
    await syncPost(makeReq(payload, `Bearer ${token}`));
    await syncPost(makeReq(payload, `Bearer ${token}`));
    expect(await rowCount()).toBe(2);

    const rows = await db
      .select()
      .from(schema.dailyUsage)
      .where(eq(schema.dailyUsage.userId, userId))
      .orderBy(schema.dailyUsage.date);
    expect(rows[0]!.messageCount).toBe(10);
    expect(rows[0]!.inputTokens).toBe(1000);
    expect(rows[1]!.sessionCount).toBe(1);
    expect(rows[1]!.projectCount).toBe(2);
  });

  it('overwrites changed values on re-sync (last write wins)', async () => {
    const updated: SyncPayload = {
      ...payload,
      days: [{ date: '2026-06-01', messages: 99, sessions: 3, inputTokens: 2222, outputTokens: 333, projects: 4 }],
    };
    await syncPost(makeReq(updated, `Bearer ${token}`));
    const rows = await db
      .select()
      .from(schema.dailyUsage)
      .where(eq(schema.dailyUsage.machineId, 'machine_testabcd1234'))
      .orderBy(schema.dailyUsage.date);
    // still 2 rows for this machine, June 1 overwritten
    expect(rows.length).toBe(2);
    expect(rows[0]!.messageCount).toBe(99);
    expect(rows[0]!.inputTokens).toBe(2222);
  });

  it('updates the token last_used_at', async () => {
    const rows = await db.select().from(schema.apiTokens).where(eq(schema.apiTokens.userId, userId));
    expect(rows[0]!.lastUsedAt).not.toBeNull();
  });
});
