# clusage

Sync your local **Claude Code** usage to [clusage.com](https://clusage.com) — a
shareable, GitHub-contribution-style activity grid for your bio.

```bash
npx clusage login <token>   # token from your clusage dashboard
npx clusage sync            # parse local logs, push daily counts
npx clusage status          # local summary + login state
```

## Privacy

The CLI reads `~/.claude/projects/**/*.jsonl` **locally** and transmits only
per-day integer counts plus a salted machine hash and the CLI version:

```jsonc
{
  "machineId": "machine_…",      // salted, one-way hash of your hostname
  "cliVersion": "0.1.0",
  "days": [
    { "date": "2026-06-08", "messages": 12, "sessions": 2,
      "inputTokens": 5000, "outputTokens": 900, "projects": 1 }
  ]
}
```

It **never** reads, stores, or sends prompt text, responses, code, file
contents, or file paths. Run `clusage sync --dry-run` to see exactly what would
be sent without sending it.

## How it works

Each run recomputes the full trailing 400-day window and upserts idempotently on
`(user, machine, date)`, so re-running is always safe and self-healing. Sync
from multiple machines — totals sum across them.

## Config

Stored at `~/.config/clusage/config.json` (mode `0600`): your token and a
one-time salted machine id. Overrides:

- `CLUSAGE_API_URL` — point at a different backend (default `https://clusage.com`)
- `CLUSAGE_TOKEN` — supply the token via env instead of `login`
- `CLUSAGE_LOGS_DIR` — override the logs directory (default `~/.claude/projects`)
