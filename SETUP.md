# clusage — setup & operations

This is what Tom needs to supply to run clusage in production. The app and CLI
build and run **without** any of these (PGlite + console-logged magic links +
Stripe-disabled), so development is unblocked; each secret unlocks a feature.

## Accounts / secrets to provide

| Var | Where to get it | Unlocks |
| --- | --- | --- |
| `DATABASE_URL` | [Neon](https://neon.tech) → project → **pooled** connection string | Production Postgres. Omit locally to use PGlite. |
| `APP_URL` | Your domain, e.g. `https://clusage.com` | Correct links in emails, badges, OG. |
| `AUTH_SECRET` | `openssl rand -hex 32` | Signs session cookies. |
| `RESEND_API_KEY` | [Resend](https://resend.com) → API Keys | Sends magic-link emails (else they print to the server console). |
| `EMAIL_FROM` | A verified Resend sender, e.g. `clusage <login@clusage.com>` | From address. |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys | Checkout. |
| `STRIPE_PRICE_ID` | Stripe → Products → create a **one-time** $2.99 price → copy `price_…` | The thing being sold. |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → add endpoint `…/api/stripe/webhook` → signing secret | Verifies webhook authenticity. |

Copy `.env.example` → `apps/web/.env.local` and fill in what you have.

## Local development

```bash
pnpm install
# Apply the schema to a local PGlite database (no Postgres needed):
cd apps/web && DATABASE_URL="pglite://.pglite-dev" pnpm db:migrate
# Run the app (defaults to the same PGlite dir):
DATABASE_URL="pglite://.pglite-dev" pnpm dev
```

Open http://localhost:3000. With no `RESEND_API_KEY`, the magic-link URL is
printed to the terminal — click it from there.

### Using a real Postgres locally / Neon

Set `DATABASE_URL` to a `postgres://…` string and run `pnpm db:migrate`, then
`pnpm dev`. Everything else is identical.

## Database

- Schema: `apps/web/src/db/schema.ts`. Generate migrations with `pnpm db:generate`,
  apply with `pnpm db:migrate` (driver-agnostic: works on Postgres or PGlite).
- Read totals **sum across `machine_id`** so a user can sync from many machines.

## The CLI

Published as `clusage` on npm, run via `npx clusage`. Config lives in
`~/.config/clusage/config.json` (token + salted machine id, `0600`).
Point it at a non-prod backend with `CLUSAGE_API_URL`.

## Deploy (Vercel)

- Set every var above in the Vercel project (Production + Preview).
- `apps/web` is the deploy root. Build runs `next build`.
- Add the Stripe webhook endpoint and paste its signing secret.
- **Put Cloudflare in front** of `clusage.com` for edge caching of
  `/u/*/badge.svg` and OG images (see Phase 6 notes / caching headers).

## Privacy guarantee

The CLI transmits ONLY: a salted machine hash, the CLI version, and per-day
integer counts (messages, sessions, tokens, projects). It never reads, stores,
or sends prompt text, responses, code, or file contents. Enforced by tests in
`packages/shared/test/privacy.test.ts`.
