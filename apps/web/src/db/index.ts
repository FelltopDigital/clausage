import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { env } from '../env.js';
import * as schema from './schema.js';
import { usesPglite, pgliteDir } from './driver.js';

/**
 * Driver selection:
 *   - A real Postgres connection string  → postgres-js (Neon in prod, local in dev).
 *   - Unset, or "pglite://<dir>" / "file:<dir>" → PGlite, an in-process WASM
 *     Postgres. This lets the whole app run and be verified with zero external
 *     services. Use "pglite://memory" for ephemeral (tests).
 *
 * The query-builder API is identical across drivers, so we expose one `db` typed
 * against the schema.
 */
declare global {
  var __clusageDb: PostgresJsDatabase<typeof schema> | undefined;
  var __clusageClient: unknown;
}

async function createDb(): Promise<PostgresJsDatabase<typeof schema>> {
  const url = env.DATABASE_URL;
  if (usesPglite(url)) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const client = (globalThis.__clusageClient as InstanceType<typeof PGlite>) ?? new PGlite(pgliteDir(url));
    globalThis.__clusageClient = client;
    // Cast: PGlite drizzle shares the same query API surface as postgres-js.
    return drizzle(client, { schema }) as unknown as PostgresJsDatabase<typeof schema>;
  }
  const postgres = (await import('postgres')).default;
  const client = (globalThis.__clusageClient as ReturnType<typeof postgres>) ?? postgres(url!, { max: 5, prepare: false });
  globalThis.__clusageClient = client;
  return drizzlePg(client, { schema });
}

export const db = globalThis.__clusageDb ?? (await createDb());
if (process.env.NODE_ENV !== 'production') globalThis.__clusageDb = db;

export { schema };
export type Db = typeof db;
