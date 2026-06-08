/**
 * Driver-agnostic migration runner. Applies ./drizzle migrations to whatever
 * DATABASE_URL points at (Postgres or PGlite). Run: pnpm db:migrate
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from '../src/env.js';
import { usesPglite, pgliteDir } from '../src/db/driver.js';

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

async function main() {
  const url = env.DATABASE_URL;
  if (usesPglite(url)) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const client = new PGlite(pgliteDir(url));
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    await client.close();
    console.log(`✓ Migrations applied (PGlite: ${pgliteDir(url) ?? 'in-memory'}).`);
  } else {
    const postgres = (await import('postgres')).default;
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const client = postgres(url!, { max: 1 });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    await client.end();
    console.log('✓ Migrations applied (Postgres).');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
