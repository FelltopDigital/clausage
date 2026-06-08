import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/index';
import { getDailyTotals, summarize } from '@/lib/usage';
import { formatNumber, formatTokens, todayUTC } from '@/lib/format';
import { env } from '@/env';
import { UsageGrid } from './usage-grid';

// Revalidate the page at most hourly; sync also revalidates this path on demand.
export const revalidate = 3600;

async function loadProfile(username: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await loadProfile(username);
  if (!user || !user.isPublic) return { title: 'Not found · clausage' };
  return {
    title: `${user.username} · clausage`,
    description: `${user.username}'s Claude Code activity grid.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await loadProfile(username);
  if (!user || !user.username || !user.isPublic) notFound();

  const days = await getDailyTotals(user.id);
  const summary = summarize(days, todayUTC());
  const base = env.APP_URL.replace(/\/$/, '');
  const badgeUrl = `${base}/u/${user.username}/badge.svg`;
  const profileUrl = `${base}/u/${user.username}`;
  const markdown = `[![clausage](${badgeUrl})](${profileUrl})`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.username}</h1>
          <p className="text-sm text-[var(--color-muted)]">Claude Code activity</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <Stat label="messages" value={formatNumber(summary.totalMessages)} />
          <Stat label="tokens" value={formatTokens(summary.totalTokens)} />
          <Stat label="streak" value={`${summary.currentStreak}🔥`} />
          <Stat label="best" value={`${summary.longestStreak}d`} />
        </div>
      </header>

      <UsageGrid days={days} theme={user.theme} today={todayUTC()} />

      <section className="mt-10">
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-muted)]">
          Embed in your README
        </h2>
        <pre className="overflow-x-auto rounded-md border border-[var(--color-panel)] bg-[var(--color-panel)] p-3 text-xs">
          <code>{markdown}</code>
        </pre>
      </section>

      <footer className="mt-12 text-center text-xs text-[var(--color-muted)]">
        Built with{' '}
        <a href={base} className="text-orange-400 hover:underline">
          clausage
        </a>{' '}
        · only daily counts leave the machine
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  );
}
