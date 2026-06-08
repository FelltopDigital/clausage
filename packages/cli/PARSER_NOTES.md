# Claude Code JSONL — empirical schema notes

Derived from real files on this machine under `~/.claude/projects/` (71 session
files, May–Jun 2026). **Real data is the source of truth.** These notes back the
aggregator in `packages/shared/src/aggregate.ts`.

## Directory layout

```
~/.claude/projects/
  <slugified-project-path>/        e.g. -Users-tom-Sites-clausage
    <sessionId>.jsonl              one file per session; filename == sessionId
```

One file ≈ one session. A file is JSON Lines: one JSON object per line.

## Record types (top-level `type`)

Observed counts across all files:

| type                  | count | used? |
| --------------------- | ----- | ----- |
| assistant             | 8217  | ✅ yes |
| user                  | 4951  | no    |
| permission-mode       | 1264  | no    |
| ai-title              | 1243  | no    |
| last-prompt           | 1218  | no    |
| file-history-snapshot | 1105  | no    |
| attachment            | 880   | no    |
| mode                  | 621   | no    |
| system                | 517   | no    |
| queue-operation       | 84    | no    |

We only read `assistant` records.

## Assistant record shape (fields we read)

Top-level keys: `cwd, entrypoint, gitBranch, isSidechain, message, parentUuid,
requestId, sessionId, timestamp, type, userType, uuid, version`.

```jsonc
{
  "type": "assistant",
  "timestamp": "2026-06-04T09:38:24.032Z",   // ISO-8601 UTC instant
  "sessionId": "a3b37055-...",               // == filename; distinct-per-day → sessions
  "cwd": "/Users/tom/Sites/clusage",         // distinct-per-day → projects (COUNTED only)
  "requestId": "req_011...",
  "message": {
    "id": "msg_013Cqf...",                   // STABLE per model turn — dedupe key
    "model": "claude-opus-4-8",              // "<synthetic>" rows are skipped
    "role": "assistant",
    "usage": {
      "input_tokens": 7493,
      "cache_creation_input_tokens": 2892,
      "cache_read_input_tokens": 16553,
      "output_tokens": 200
      // ...also iterations[], server_tool_use, service_tier — ignored
    }
    // message.content[] is NEVER read (privacy)
  }
}
```

## Key findings that drive the aggregation

1. **Records split per turn.** In one sample file: 409 assistant records but only
   215 distinct `requestId`s, and the duplicates share the **same `message.id`
   and identical `usage`** (verified: each copy reports the same input/output
   tokens — usage is the request total, not incremental).
   → We **dedupe by `message.id`** so messages and tokens are each counted once
   per turn. Counting raw records would ~2× both.

2. **`<synthetic>` model.** 1 record observed with `model: "<synthetic>"`
   (API-error placeholder, zero usage). → skipped.

3. **Models seen:** `claude-opus-4-7` (4917), `claude-opus-4-8` (2989),
   `claude-haiku-4-5-20251001` (312), `<synthetic>` (1).

4. **Timestamps are UTC.** We bucket each instant into the user's **local** day
   via `Intl.DateTimeFormat('en-CA', { timeZone })`. Sessions spanning midnight
   are attributed to each local day independently.

5. **Robustness:** lines that fail `JSON.parse` (partial / truncated tail line)
   are skipped; records missing a valid timestamp can't be bucketed and are
   skipped; records missing `usage` still count as a message (0 tokens).

## Metric definitions (the push contract)

For each local day:

- **messages** — distinct assistant `message.id`s (assistant turns).
- **sessions** — distinct `sessionId`s active that day.
- **inputTokens** — Σ `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` (once per turn).
- **outputTokens** — Σ `output_tokens` (once per turn).
- **projects** — distinct `cwd`s that day (only the **count** is kept; paths never leave the machine).

## Validation against raw data (this machine, 2026-06-08)

- Parser: **4087** messages over **23** active days (last 400-day window).
- Raw `jq` distinct non-synthetic `message.id` count: **4088**.
- The single-record difference is one message whose every record carries an
  unparseable timestamp (correctly unbucketable). 99.98% agreement.
