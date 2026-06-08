import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { aggregateFileContents } from '../src/aggregate.js';
import { DailyUsageSchema, SyncPayloadSchema } from '../src/schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(join(here, 'fixtures', 'sample.jsonl'), 'utf8');

/**
 * The privacy invariant, asserted structurally: the aggregated payload must
 * contain ONLY dates, opaque ids and integer counts — never any free text,
 * code, file paths or content lifted from the logs.
 */
describe('privacy invariant', () => {
  const days = aggregateFileContents([sample], { timeZone: 'UTC' });

  it('every day has exactly the allowed numeric/date keys', () => {
    const allowed = new Set([
      'date',
      'messages',
      'sessions',
      'inputTokens',
      'outputTokens',
      'projects',
    ]);
    for (const day of days) {
      for (const key of Object.keys(day)) {
        expect(allowed.has(key)).toBe(true);
      }
      // All non-date values are integers.
      expect(typeof day.date).toBe('string');
      for (const k of ['messages', 'sessions', 'inputTokens', 'outputTokens', 'projects'] as const) {
        expect(Number.isInteger(day[k])).toBe(true);
      }
    }
  });

  it('the serialized payload contains no content leaked from the logs', () => {
    const payload = { machineId: 'machine_abcdef12', cliVersion: '0.1.0', days };
    // The fixture deliberately embeds these markers in content/text/path fields.
    const blob = JSON.stringify(payload);
    for (const marker of ['REDACTED', 'proj-one', 'proj-two', 'Bash', 'API Error', '/Users/x']) {
      expect(blob.includes(marker)).toBe(false);
    }
  });

  it('the payload validates against the shared contract', () => {
    const payload = { machineId: 'machine_abcdef12', cliVersion: '0.1.0', days };
    expect(() => SyncPayloadSchema.parse(payload)).not.toThrow();
    for (const day of days) expect(() => DailyUsageSchema.parse(day)).not.toThrow();
  });
});
