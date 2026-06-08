import { z } from 'zod';

/**
 * The push contract — the ONLY data shape that ever leaves a user's machine.
 *
 * PRIVACY INVARIANT: every field here is a date, an opaque hash, or an integer
 * count. There is deliberately NO field that can carry prompt text, response
 * text, code, file paths, or file contents. See the privacy test in
 * `test/privacy.test.ts` which asserts this structurally.
 */

/** A single day's aggregated, content-free usage counts. */
export const DailyUsageSchema = z.object({
  /** YYYY-MM-DD, bucketed in the user's LOCAL timezone. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  /** Assistant turns that day (primary intensity metric). */
  messages: z.number().int().nonnegative(),
  /** Distinct Claude Code sessions active that day. */
  sessions: z.number().int().nonnegative(),
  /** Sum of input tokens (incl. cache) across the day. */
  inputTokens: z.number().int().nonnegative(),
  /** Sum of output tokens across the day. */
  outputTokens: z.number().int().nonnegative(),
  /** Distinct projects worked on that day. */
  projects: z.number().int().nonnegative(),
});
export type DailyUsage = z.infer<typeof DailyUsageSchema>;

/** The full request body the CLI POSTs to /api/sync. */
export const SyncPayloadSchema = z.object({
  /** Salted hash of hostname; generated once, cached in CLI config. */
  machineId: z.string().min(8).max(128),
  /** CLI version string, for diagnostics. */
  cliVersion: z.string().min(1).max(32),
  /** Trailing window of daily counts (recomputed in full each run). */
  days: z.array(DailyUsageSchema).max(800),
});
export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

export const SyncResponseSchema = z.object({
  ok: z.literal(true),
  daysUpserted: z.number().int().nonnegative(),
  username: z.string(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

/** Username slug rules — drives the public URL /u/<username>. */
export const UsernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'lowercase letters, numbers and hyphens only');

/** How far back the CLI recomputes each run. */
export const TRAILING_WINDOW_DAYS = 400;
