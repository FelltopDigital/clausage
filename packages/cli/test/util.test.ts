import { describe, it, expect } from 'vitest';
import { currentStreak, formatTokens } from '../src/util.js';
import type { DailyUsage } from '@clausage/shared';

const day = (date: string, messages: number): DailyUsage => ({
  date,
  messages,
  sessions: 1,
  inputTokens: 0,
  outputTokens: 0,
  projects: 1,
});

describe('currentStreak', () => {
  it('counts consecutive active days ending today', () => {
    const days = [day('2026-06-06', 3), day('2026-06-07', 1), day('2026-06-08', 5)];
    expect(currentStreak(days, '2026-06-08')).toBe(3);
  });

  it('tolerates no activity yet today (counts through yesterday)', () => {
    const days = [day('2026-06-06', 3), day('2026-06-07', 1)];
    expect(currentStreak(days, '2026-06-08')).toBe(2);
  });

  it('breaks on a gap', () => {
    const days = [day('2026-06-05', 3), day('2026-06-08', 5)];
    expect(currentStreak(days, '2026-06-08')).toBe(1);
  });

  it('is zero with no recent activity', () => {
    const days = [day('2026-01-01', 3)];
    expect(currentStreak(days, '2026-06-08')).toBe(0);
  });
});

describe('formatTokens', () => {
  it('formats compactly', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(12_500)).toBe('12.5K');
    expect(formatTokens(3_400_000)).toBe('3.4M');
  });
});
