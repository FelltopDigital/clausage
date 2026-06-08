import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from 'drizzle-orm';
import { SyncPayloadSchema } from '@clusage/shared';
import { db, schema } from '@/db/index';
import { authenticateBearer } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const auth = await authenticateBearer(req);
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API token' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SyncPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const payload = parsed.data;

  if (payload.days.length > 0) {
    const now = new Date();
    const rows = payload.days.map((d) => ({
      userId: auth.user.id,
      machineId: payload.machineId,
      date: d.date,
      messageCount: d.messages,
      sessionCount: d.sessions,
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      projectCount: d.projects,
      updatedAt: now,
    }));

    // Idempotent upsert on (user, machine, date): re-running overwrites, never
    // duplicates. Full-window recompute means the latest push is authoritative.
    await db
      .insert(schema.dailyUsage)
      .values(rows)
      .onConflictDoUpdate({
        target: [schema.dailyUsage.userId, schema.dailyUsage.machineId, schema.dailyUsage.date],
        set: {
          messageCount: sql`excluded.message_count`,
          sessionCount: sql`excluded.session_count`,
          inputTokens: sql`excluded.input_tokens`,
          outputTokens: sql`excluded.output_tokens`,
          projectCount: sql`excluded.project_count`,
          updatedAt: now,
        },
      });
  }

  // A fresh sync invalidates the cached page, badge and OG image immediately.
  // Guarded: revalidatePath is a no-op/throws outside an app request context.
  if (auth.user.username) {
    try {
      const base = `/u/${auth.user.username}`;
      revalidatePath(base);
      revalidatePath(`${base}/badge.svg`);
      revalidatePath(`${base}/opengraph-image`);
    } catch {
      /* not in a request scope (e.g. tests) */
    }
  }

  return NextResponse.json({
    ok: true as const,
    daysUpserted: payload.days.length,
    username: auth.user.username ?? '',
  });
}
