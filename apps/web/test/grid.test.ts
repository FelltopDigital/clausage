import { describe, it, expect } from 'vitest';
import type { DailyUsage } from '@clusage/shared';
import {
  levelForMessages,
  buildMonthGrid,
  buildYearGrid,
  indexByDate,
  colorFor,
  THEMES,
} from '@/lib/grid';

const day = (date: string, messages: number): DailyUsage => ({
  date,
  messages,
  sessions: 1,
  inputTokens: 0,
  outputTokens: 0,
  projects: 1,
});

describe('levelForMessages buckets (0 / 1–5 / 6–15 / 16–40 / 40+)', () => {
  it('maps message counts to the five buckets', () => {
    expect(levelForMessages(0)).toBe(0);
    expect(levelForMessages(1)).toBe(1);
    expect(levelForMessages(5)).toBe(1);
    expect(levelForMessages(6)).toBe(2);
    expect(levelForMessages(15)).toBe(2);
    expect(levelForMessages(16)).toBe(3);
    expect(levelForMessages(40)).toBe(3);
    expect(levelForMessages(41)).toBe(4);
    expect(levelForMessages(9999)).toBe(4);
  });
});

describe('colorFor', () => {
  it('picks the themed colour for the bucket, falling back to orange', () => {
    expect(colorFor(0, 'green')).toBe(THEMES.green[0]);
    expect(colorFor(100, 'green')).toBe(THEMES.green[4]);
    expect(colorFor(100, 'nonsense')).toBe(THEMES.orange[4]);
  });
});

describe('buildMonthGrid', () => {
  it('aligns the 1st to its weekday and pads to full weeks', () => {
    // June 2026: June 1 is a Monday (weekday index 1).
    const byDate = indexByDate([day('2026-06-01', 10), day('2026-06-15', 50)]);
    const weeks = buildMonthGrid(byDate, 2026, 5); // month0=5 → June
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // First row: Sunday is padding, Monday is the 1st.
    expect(weeks[0]![0]!.date).toBeNull();
    expect(weeks[0]![1]!.date).toBe('2026-06-01');
    expect(weeks[0]![1]!.messages).toBe(10);
    // The 15th carries its count.
    const fifteenth = weeks.flat().find((c) => c.date === '2026-06-15');
    expect(fifteenth?.messages).toBe(50);
  });
});

describe('buildYearGrid', () => {
  it('produces 53 week-columns of 7 days and marks future cells null', () => {
    const byDate = indexByDate([day('2026-06-08', 12)]);
    const end = new Date(Date.UTC(2026, 5, 8)); // Monday
    const { columns } = buildYearGrid(byDate, end, 53);
    expect(columns.length).toBe(53);
    expect(columns.every((c) => c.length === 7)).toBe(true);
    // Find the seeded day somewhere in the grid.
    const found = columns.flat().find((c) => c.date === '2026-06-08');
    expect(found?.messages).toBe(12);
    // Days after the end date (rest of that week) are null padding.
    const future = columns.flat().filter((c) => c.date === null);
    expect(future.length).toBeGreaterThan(0);
  });
});
