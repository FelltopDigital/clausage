import { and, eq, gte, sql } from 'drizzle-orm';
import type { DailyUsage } from '@clusage/shared';
import { db, schema } from '../db/index';

/**
 * Daily totals for a user, summed across all their machines (a user may sync
 * from several). Returned sorted ascending by date.
 */
export async function getDailyTotals(userId: string, sinceDate?: string): Promise<DailyUsage[]> {
  const where = sinceDate
    ? and(eq(schema.dailyUsage.userId, userId), gte(schema.dailyUsage.date, sinceDate))
    : eq(schema.dailyUsage.userId, userId);

  const rows = await db
    .select({
      date: schema.dailyUsage.date,
      messages: sql<number>`sum(${schema.dailyUsage.messageCount})::int`,
      sessions: sql<number>`sum(${schema.dailyUsage.sessionCount})::int`,
      inputTokens: sql<number>`sum(${schema.dailyUsage.inputTokens})::bigint`,
      outputTokens: sql<number>`sum(${schema.dailyUsage.outputTokens})::bigint`,
      projects: sql<number>`sum(${schema.dailyUsage.projectCount})::int`,
    })
    .from(schema.dailyUsage)
    .where(where)
    .groupBy(schema.dailyUsage.date)
    .orderBy(schema.dailyUsage.date);

  // bigint sums come back as strings from pg; coerce to number.
  return rows.map((r) => ({
    date: r.date,
    messages: Number(r.messages),
    sessions: Number(r.sessions),
    inputTokens: Number(r.inputTokens),
    outputTokens: Number(r.outputTokens),
    projects: Number(r.projects),
  }));
}

export interface UsageSummary {
  totalMessages: number;
  totalTokens: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  lastActive: string | null;
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

export function summarize(days: DailyUsage[], today: string): UsageSummary {
  const active = new Set(days.filter((d) => d.messages > 0).map((d) => d.date));

  // current streak (tolerates no activity yet today)
  let cursor = active.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // longest streak
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of [...active].sort()) {
    if (prev && addDays(prev, 1) === date) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  return {
    totalMessages: days.reduce((s, d) => s + d.messages, 0),
    totalTokens: days.reduce((s, d) => s + d.inputTokens + d.outputTokens, 0),
    activeDays: active.size,
    currentStreak: current,
    longestStreak: longest,
    lastActive: days.length ? days[days.length - 1]!.date : null,
  };
}
