import 'dotenv/config';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/**
 * Drizzle SQL migration'larini uygular. `drizzle-kit` (dev bagimliligi) yerine
 * `drizzle-orm` migrator'unu kullanir, boylece production imajinda calisabilir.
 * Migration SQL klasoru `IAM_MIGRATIONS_DIR` ile verilir; varsayilan olarak
 * `packages/iam/drizzle` (calisma dizinine gore) cozulur.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.trim() === '') {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const migrationsFolder =
    process.env.IAM_MIGRATIONS_DIR ?? path.resolve(process.cwd(), 'packages/iam/drizzle');

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder,
      migrationsTable: 'iam_migrations',
      migrationsSchema: 'public',
    });
    process.stdout.write(`Migrations applied from ${migrationsFolder}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`Migration failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
