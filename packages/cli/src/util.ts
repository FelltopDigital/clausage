import type { DailyUsage } from '@clusage/shared';

/** Add n days to a YYYY-MM-DD date string (UTC-safe, calendar arithmetic). */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + n));
  return dt.toISOString().slice(0, 10);
}

/** Local "today" as YYYY-MM-DD in the given (or host) timezone. */
export function localToday(timeZone?: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Current streak: consecutive days ending today (or yesterday) with messages>0.
 * A gap today is tolerated so the streak doesn't read 0 before you've worked.
 */
export function currentStreak(days: DailyUsage[], today: string): number {
  const active = new Set(days.filter((d) => d.messages > 0).map((d) => d.date));
  let cursor = active.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function sumField(days: DailyUsage[], field: keyof DailyUsage): number {
  let total = 0;
  for (const d of days) {
    const v = d[field];
    if (typeof v === 'number') total += v;
  }
  return total;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Compact token count, e.g. 1.2M, 34.5K. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
