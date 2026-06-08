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
  var __clusageDb: DB | undefined;
  var __clusageClient: unknown;
}

function createDb(): DB {
  const url = env.DATABASE_URL;
  if (usesPglite(url)) {
    const client = (globalThis.__clusageClient as PGlite) ?? new PGlite(pgliteDir(url));
    globalThis.__clusageClient = client;
    // PGlite drizzle shares the same query-builder API surface as postgres-js.
    return drizzlePglite(client, { schema }) as unknown as DB;
  }
  const client = (globalThis.__clusageClient as ReturnType<typeof postgres>) ?? postgres(url!, { max: 5, prepare: false });
  globalThis.__clusageClient = client;
  return drizzlePg(client, { schema });
}

function getDb(): DB {
  const existing = globalThis.__clusageDb;
  if (existing) return existing;
  const created = createDb();
  globalThis.__clusageDb = created;
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
