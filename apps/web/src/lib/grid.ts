import type { DailyUsage } from '@clausage/shared';

/** Five intensity buckets, defined in messages/day (brief: 0 / 1–5 / 6–15 / 16–40 / 40+). */
export function levelForMessages(messages: number): 0 | 1 | 2 | 3 | 4 {
  if (messages <= 0) return 0;
  if (messages <= 5) return 1;
  if (messages <= 15) return 2;
  if (messages <= 40) return 3;
  return 4;
}

export const BUCKET_LABELS = ['0', '1–5', '6–15', '16–40', '40+'] as const;

export type ThemeName = 'orange' | 'green' | 'blue' | 'purple';

/** Palette per theme: index 0 = empty, 1..4 = increasing intensity. */
export const THEMES: Record<ThemeName, [string, string, string, string, string]> = {
  orange: ['#1c1f26', '#5a2e0c', '#9a4a10', '#d97316', '#fb923c'],
  green: ['#1c1f26', '#0e4429', '#006d32', '#26a641', '#39d353'],
  blue: ['#1c1f26', '#0b3a5e', '#10618f', '#1f8fd9', '#4cb3ff'],
  purple: ['#1c1f26', '#3b1d5e', '#5b2c92', '#8b46d9', '#b478ff'],
};

export function themeColors(theme: string): [string, string, string, string, string] {
  return THEMES[(theme as ThemeName) in THEMES ? (theme as ThemeName) : 'orange'];
}

export function colorFor(messages: number, theme: string): string {
  return themeColors(theme)[levelForMessages(messages)];
}

/** Index daily rows by their date string. */
export function indexByDate(days: DailyUsage[]): Map<string, DailyUsage> {
  return new Map(days.map((d) => [d.date, d]));
}

/* ── date helpers (UTC calendar math; dates are bare YYYY-MM-DD) ───────────── */

export function parseYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export interface Cell {
  date: string | null; // null = padding cell (outside range / month)
  messages: number;
}

/**
 * Annual heatmap: GitHub-style columns of weeks (Sun→Sat) covering the trailing
 * `weeks` window ending on `endDate`. Returns weeks[] each with 7 day cells, and
 * month labels positioned at the column where each month starts.
 */
export function buildYearGrid(
  byDate: Map<string, DailyUsage>,
  endDate: Date,
  weeks = 53,
): { columns: Cell[][]; monthLabels: { col: number; label: string }[] } {
  // End on the Saturday of the current week so the last column is full-height.
  const end = addDays(endDate, 6 - endDate.getUTCDay());
  const totalDays = weeks * 7;
  const start = addDays(end, -(totalDays - 1));

  const columns: Cell[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const col: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = addDays(start, w * 7 + d);
      const key = ymd(cur);
      const isFuture = cur > endDate;
      const row = byDate.get(key);
      col.push({ date: isFuture ? null : key, messages: isFuture ? 0 : (row?.messages ?? 0) });
      // Place a month label on the first week that contains the 1st-of-month (top row).
      if (d === 0 && cur.getUTCMonth() !== lastMonth && cur.getUTCDate() <= 7 && !isFuture) {
        monthLabels.push({ col: w, label: MONTHS[cur.getUTCMonth()]! });
        lastMonth = cur.getUTCMonth();
      }
    }
    columns.push(col);
  }
  return { columns, monthLabels };
}

/** Calendar grid for a single month: weeks (rows) of 7 day cells, padded. */
export function buildMonthGrid(
  byDate: Map<string, DailyUsage>,
  year: number,
  month0: number, // 0-based month
): Cell[][] {
  const first = new Date(Date.UTC(year, month0, 1));
  const startPad = first.getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, messages: 0 });
  for (let day = 1; day <= daysInMonth; day++) {
    const key = ymd(new Date(Date.UTC(year, month0, day)));
    cells.push({ date: key, messages: byDate.get(key)?.messages ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, messages: 0 });

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
