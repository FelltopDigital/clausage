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
pnpm -r test         # 33 tests: parser, privacy, grid, sync idempotency, billing
```

Run the app with zero external services (uses in-process PGlite):

```bash
cd apps/web
DATABASE_URL="pglite://.pglite-dev" pnpm db:migrate
DATABASE_URL="pglite://.pglite-dev" pnpm db:seed     # demo user at /u/demo
DATABASE_URL="pglite://.pglite-dev" pnpm dev
```

With no `RESEND_API_KEY`, magic-link URLs print to the server console. See
[SETUP.md](./SETUP.md) for the secrets needed in production.

## Data flow & privacy

The CLI derives the JSONL schema empirically (see
[`packages/cli/PARSER_NOTES.md`](./packages/cli/PARSER_NOTES.md)): it dedupes
assistant turns by `message.id`, sums tokens once per turn, buckets to the local
day, and emits only integer counts. A structural test
(`packages/shared/test/privacy.test.ts`) asserts no log content can appear in the
outbound payload.

## How it works

1. Sign in with a magic link, pick a username.
2. Mint a token, `npx clusage login`, then `npx clusage sync`.
3. Pay $2.99 once to make your page public, and share it + a README badge.

The CLI recomputes the full trailing 400-day window every run and upserts
idempotently on `(user, machine, date)`, so re-running is always safe.
