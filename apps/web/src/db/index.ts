import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';
import { usesPglite, pgliteDir } from './driver';

/**
 * Driver selection:
 *   - A real Postgres connection string  → postgres-js (Neon in prod, local in dev).
 *   - Unset, or "pglite://<dir>" / "file:<dir>" → PGlite, an in-process WASM
 *     Postgres, so the whole app runs with zero external services. Use
 *     "pglite://memory" for ephemeral (tests).
 *
 * Construction is LAZY: importing this module never opens a connection (so
 * `next build` can analyze route modules without spinning up PGlite). The client
 * is created on first query and cached on globalThis across hot reloads.
 */
type DB = PostgresJsDatabase<typeof schema>;

declare global {
  var __clausageDb: DB | undefined;
  var __clausageClient: unknown;
}

function createDb(): DB {
  const url = env.DATABASE_URL;
  if (usesPglite(url)) {
    // Guard: PGlite is ephemeral on serverless. Never let prod silently use it.
    if (process.env.NODE_ENV === 'production' && !process.env.CLAUSAGE_ALLOW_PGLITE) {
      throw new Error(
        'DATABASE_URL is not set in production. Set a Postgres connection string (see SETUP.md).',
      );
    }
    const client = (globalThis.__clausageClient as PGlite) ?? new PGlite(pgliteDir(url));
    globalThis.__clausageClient = client;
    // PGlite drizzle shares the same query-builder API surface as postgres-js.
    return drizzlePglite(client, { schema }) as unknown as DB;
  }
  const client = (globalThis.__clausageClient as ReturnType<typeof postgres>) ?? postgres(url!, { max: 5, prepare: false });
  globalThis.__clausageClient = client;
  return drizzlePg(client, { schema });
}

function getDb(): DB {
  const existing = globalThis.__clausageDb;
  if (existing) return existing;
  const created = createDb();
  globalThis.__clausageDb = created;
  return created;
}

/** Lazy proxy: forwards all access to the real db, created on first use. */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export { schema };
export type Db = DB;
