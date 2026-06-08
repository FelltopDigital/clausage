import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aggregateFileContents, aggregateLines, toLocalDate } from '../src/aggregate.js';

const here = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(join(here, 'fixtures', 'sample.jsonl'), 'utf8');

describe('aggregateFileContents (UTC)', () => {
  const days = aggregateFileContents([sample], { timeZone: 'UTC' });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));

  it('produces one entry per active local day, sorted', () => {
    expect(days.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-02']);
  });

  it('counts assistant turns deduped by message.id', () => {
    expect(byDate['2026-06-01'].messages).toBe(2); // msg_1 (x2 records) + msg_2
    expect(byDate['2026-06-02'].messages).toBe(2); // msg_3 (x2 records) + msg_4
  });

  it('sums input tokens including cache, output tokens, once per turn', () => {
    // msg_1: 100+50+200=350, msg_2: 300  => 650
    expect(byDate['2026-06-01'].inputTokens).toBe(650);
    expect(byDate['2026-06-01'].outputTokens).toBe(50);
    // msg_3: 80, msg_4: 120 => 200
    expect(byDate['2026-06-02'].inputTokens).toBe(200);
    expect(byDate['2026-06-02'].outputTokens).toBe(25);
  });

  it('counts distinct sessions and projects per day', () => {
    expect(byDate['2026-06-01'].sessions).toBe(1); // sess-A
    expect(byDate['2026-06-01'].projects).toBe(1); // proj-one
    expect(byDate['2026-06-02'].sessions).toBe(2); // sess-A, sess-B
    expect(byDate['2026-06-02'].projects).toBe(2); // proj-two, proj-one
  });

  it('skips synthetic, non-assistant, bad-date and partial lines', () => {
    // msg_synthetic excluded => no token contribution / no extra messages
    // the truncated msg_6 line on 2026-06-03 never appears
    expect(byDate['2026-06-03']).toBeUndefined();
  });
});

describe('toLocalDate timezone bucketing', () => {
  it('buckets to the local day, crossing the UTC date line', () => {
    // 02:00 UTC on Jun 1 is still May 31 in Los Angeles (UTC-7 in June)
    expect(toLocalDate('2026-06-01T02:00:00.000Z', 'America/Los_Angeles')).toBe('2026-05-31');
    expect(toLocalDate('2026-06-01T02:00:00.000Z', 'UTC')).toBe('2026-06-01');
  });

  it('returns null for unparseable timestamps', () => {
    expect(toLocalDate('not-a-date')).toBeNull();
  });
});

describe('window filtering', () => {
  it('keeps only days within the trailing window', () => {
    const now = new Date('2026-06-02T12:00:00.000Z');
    const days = aggregateFileContents([sample], { timeZone: 'UTC', windowDays: 1, now });
    expect(days.map((d) => d.date)).toEqual(['2026-06-02']);
  });
});

describe('robustness', () => {
  it('handles empty and whitespace input', () => {
    expect(aggregateLines(['', '   ', '\n'])).toEqual([]);
  });

  it('never throws on garbage', () => {
    expect(() => aggregateLines(['not json', '{bad', '42', 'null'])).not.toThrow();
  });
});
