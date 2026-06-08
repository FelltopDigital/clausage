/**
 * Seed a demo user with realistic usage so the public grid, badge and OG image
 * can be developed and verified. Idempotent: re-running resets the demo user.
 *
 * Run: pnpm db:seed   (respects DATABASE_URL; defaults to PGlite .pglite-dev)
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/index.js';
import { mintApiToken } from '../src/lib/crypto.js';

const DEMO_EMAIL = 'demo@clausage.com';
const DEMO_USERNAME = 'demo';
const MACHINE = 'machine_demoseed0001';

// Deterministic pseudo-random so seeds are reproducible without Math.random.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  // Reset
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));
  if (existing[0]) {
    await db.delete(schema.users).where(eq(schema.users.id, existing[0].id)); // cascades
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      email: DEMO_EMAIL,
      username: DEMO_USERNAME,
      isPublic: true,
      isPaid: true,
      theme: 'orange',
    })
    .returning();

  const { token, hash, prefix } = mintApiToken();
  await db
    .insert(schema.apiTokens)
    .values({ userId: user!.id, tokenHash: hash, prefix, label: 'demo seed' });

  const rand = rng(42);
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const rows: (typeof schema.dailyUsage.$inferInsert)[] = [];

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const dow = d.getUTCDay();
    const weekendDamp = dow === 0 || dow === 6 ? 0.4 : 1;
    // ~25% of days idle, otherwise a skewed intensity.
    if (rand() < 0.25) continue;
    const intensity = Math.pow(rand(), 1.8) * weekendDamp; // skew toward fewer
    const messages = Math.round(intensity * 70);
    if (messages === 0) continue;
    const sessions = Math.max(1, Math.round(messages / 12));
    const inputTokens = messages * (3000 + Math.round(rand() * 4000));
    const outputTokens = messages * (300 + Math.round(rand() * 400));
    const projects = Math.max(1, Math.round(rand() * 3));
    rows.push({
      userId: user!.id,
      machineId: MACHINE,
      date: ymd(d),
      messageCount: messages,
      sessionCount: sessions,
      inputTokens,
      outputTokens,
      projectCount: projects,
    });
  }

  await db.insert(schema.dailyUsage).values(rows);

  console.log(`✓ Seeded user "${DEMO_USERNAME}" (${DEMO_EMAIL})`);
  console.log(`  ${rows.length} active days over the last 365`);
  console.log(`  demo token: ${token}`);
  console.log(`  public page: /u/${DEMO_USERNAME}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
