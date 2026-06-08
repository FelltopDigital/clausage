# clusage

Turn your local **Claude Code** activity into a shareable, GitHub-contribution-style
usage grid for your bio — `clusage.com/u/<username>` plus an embeddable README badge.

Privacy-first: the CLI aggregates `~/.claude/projects/**/*.jsonl` **locally** and
transmits only daily integer counts. No prompt text, responses, code, or file
contents ever leave your machine.

## Monorepo layout

```
apps/web         Next.js (App Router) — auth, API, public grid, badge, OG, payments
packages/cli     `clusage` — npx CLI: login / sync / status
packages/shared  zod schemas + the pure aggregation function (the data contract)
```

## Quick start

```bash
pnpm install
pnpm -r build
pnpm test            # parser + privacy + CLI tests
```

See [SETUP.md](./SETUP.md) for running the app and the secrets needed in prod.

## How it works

1. Sign in with a magic link, pick a username.
2. Mint a token, `npx clusage login`, then `npx clusage sync`.
3. Pay $2.99 once to make your page public, and share it + a README badge.

The CLI recomputes the full trailing 400-day window every run and upserts
idempotently on `(user, machine, date)`, so re-running is always safe.
