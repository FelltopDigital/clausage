import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getCurrentUser } from '@/lib/session';
import { getDailyTotals, summarize } from '@/lib/usage';
import { formatNumber, formatTokens, todayUTC } from '@/lib/format';
import { env } from '@/env';
import { TokenManager } from './token-manager';
import { PublishToggle } from './publish-toggle';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.username) redirect('/onboarding');
  const { upgraded } = await searchParams;

  const days = await getDailyTotals(user.id);
  const summary = summarize(days, todayUTC());
  const tokens = await db
    .select({
      id: schema.apiTokens.id,
      prefix: schema.apiTokens.prefix,
      label: schema.apiTokens.label,
      lastUsedAt: schema.apiTokens.lastUsedAt,
      createdAt: schema.apiTokens.createdAt,
    })
    .from(schema.apiTokens)
    .where(eq(schema.apiTokens.userId, user.id))
    .orderBy(desc(schema.apiTokens.createdAt));

  const base = env.APP_URL.replace(/\/$/, '');
  const publicUrl = `${base}/u/${user.username}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:cursor-pointer">
            Sign out
          </button>
        </form>
      </header>

      {upgraded && user.isPaid && (
        <div className="mb-8 rounded-md border border-green-500/40 bg-green-500/10 p-4 text-sm">
          🎉 You&apos;re upgraded! Make your page public below and share it.
        </div>
      )}

      <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Messages" value={formatNumber(summary.totalMessages)} />
        <Stat label="Tokens" value={formatTokens(summary.totalTokens)} />
        <Stat label="Active days" value={String(summary.activeDays)} />
        <Stat label="Streak" value={`${summary.currentStreak}🔥`} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Your public page</h2>
        <PublishToggle
          isPublic={user.isPublic}
          isPaid={user.isPaid}
          publicUrl={publicUrl}
          username={user.username}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">CLI tokens</h2>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Generate a token, then run it on your machine:
        </p>
        <pre className="mb-4 overflow-x-auto rounded-md bg-[var(--color-panel)] p-3 text-sm">
          <code>
            npx clausage login {'<token>'}
            {'\n'}npx clausage sync
          </code>
        </pre>
        <TokenManager initialTokens={tokens} />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
