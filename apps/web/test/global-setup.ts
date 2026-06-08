import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Clean + migrate a fresh PGlite database before the test suite runs. */
export default async function setup() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '.pglite-test');
  rmSync(dir, { recursive: true, force: true });

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');

  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
  const client = new PGlite(dir);
  const db = drizzle(client);
  await migrate(db, { migrationsFolder });
  await client.close();
}
