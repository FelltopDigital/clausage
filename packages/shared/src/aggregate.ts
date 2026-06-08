import { z } from 'zod';
import type { DailyUsage } from './schema.js';

/**
 * Aggregates Claude Code JSONL logs into content-free daily counts.
 *
 * Schema derived empirically from real ~/.claude/projects/**\/*.jsonl files
 * (see packages/cli/PARSER_NOTES.md). The fields we read:
 *   - type            "assistant" marks a model turn
 *   - timestamp       ISO-8601 UTC instant
 *   - sessionId       one session ≈ one file
 *   - cwd             project working directory (used only to COUNT distinct projects)
 *   - message.id      stable id; split/streamed records repeat it — dedupe key
 *   - message.model   "<synthetic>" rows are placeholders and are skipped
 *   - message.usage.{input_tokens,cache_creation_input_tokens,
 *                    cache_read_input_tokens,output_tokens}
 *
 * We NEVER read message.content or any free-text field.
 */

/** Minimal, defensive shape of the records we care about. */
const AssistantRecordSchema = z.object({
  type: z.literal('assistant'),
  timestamp: z.string(),
  sessionId: z.string().optional(),
  cwd: z.string().optional(),
  message: z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    usage: z
      .object({
        input_tokens: z.number().optional(),
        cache_creation_input_tokens: z.number().optional(),
        cache_read_input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
      })
      .optional(),
  }),
});

export interface AggregateOptions {
  /** IANA timezone for day bucketing. Defaults to the host's local zone. */
  timeZone?: string;
  /** If set with `now`, only keep days within the trailing window. */
  windowDays?: number;
  /** Reference "now" for window filtering. Defaults to the wall clock. */
  now?: Date;
}

interface DayAccumulator {
  messages: number;
  inputTokens: number;
  outputTokens: number;
  sessions: Set<string>;
  projects: Set<string>;
}

/** Format a UTC instant as YYYY-MM-DD in the given IANA timezone. */
export function toLocalDate(iso: string, timeZone?: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // en-CA yields YYYY-MM-DD; timeZone shifts the instant to the local day.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(ms));
}

/**
 * Pure aggregation over raw JSONL lines.
 *
 * Handles: partial/garbage lines (skipped), records split across multiple
 * lines sharing one message.id (counted once), sessions spanning multiple days
 * (each day attributed independently), and missing/edited fields (skipped).
 */
export function aggregateLines(lines: Iterable<string>, opts: AggregateOptions = {}): DailyUsage[] {
  const days = new Map<string, DayAccumulator>();
  // message.id is globally unique per model turn; dedupe across all lines/files
  // so streamed/duplicated records and resumed sessions don't double-count.
  const seenMessageIds = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line[0] !== '{') continue;

    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // partial / multi-line / corrupt — skip
    }

    if ((obj as { type?: unknown })?.type !== 'assistant') continue;

    const parsed = AssistantRecordSchema.safeParse(obj);
    if (!parsed.success) continue;
    const rec = parsed.data;

    if (rec.message.model === '<synthetic>') continue;

    const date = toLocalDate(rec.timestamp, opts.timeZone);
    if (!date) continue;

    const msgId = rec.message.id;
    // If there's no id we still count the turn, but it can't be deduped.
    if (msgId) {
      if (seenMessageIds.has(msgId)) {
        // Already counted this turn's messages/tokens; still record the day's
        // session/project presence (cheap and idempotent).
        const acc = days.get(date);
        if (acc) {
          if (rec.sessionId) acc.sessions.add(rec.sessionId);
          if (rec.cwd) acc.projects.add(rec.cwd);
        }
        continue;
      }
      seenMessageIds.add(msgId);
    }

    let acc = days.get(date);
    if (!acc) {
      acc = {
        messages: 0,
        inputTokens: 0,
        outputTokens: 0,
        sessions: new Set(),
        projects: new Set(),
      };
      days.set(date, acc);
    }

    acc.messages += 1;
    const u = rec.message.usage;
    if (u) {
      acc.inputTokens +=
        (u.input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0);
      acc.outputTokens += u.output_tokens ?? 0;
    }
    if (rec.sessionId) acc.sessions.add(rec.sessionId);
    if (rec.cwd) acc.projects.add(rec.cwd);
  }

  let result: DailyUsage[] = [...days.entries()]
    .map(([date, acc]) => ({
      date,
      messages: acc.messages,
      sessions: acc.sessions.size,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      projects: acc.projects.size,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (opts.windowDays && opts.windowDays > 0) {
    const ref = opts.now ?? new Date();
    const cutoffMs = ref.getTime() - (opts.windowDays - 1) * 86_400_000;
    const cutoff = toLocalDate(new Date(cutoffMs).toISOString(), opts.timeZone);
    if (cutoff) result = result.filter((d) => d.date >= cutoff);
  }

  return result;
}

/** Convenience: aggregate over many already-read file contents. */
export function aggregateFileContents(
  contents: Iterable<string>,
  opts: AggregateOptions = {},
): DailyUsage[] {
  function* allLines(): Generator<string> {
    for (const content of contents) {
      for (const line of content.split('\n')) yield line;
    }
  }
  return aggregateLines(allLines(), opts);
}
