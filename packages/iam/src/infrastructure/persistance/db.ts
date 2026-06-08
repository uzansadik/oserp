// packages/iam/src/infrastructure/persistence/drizzle/db.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schemas';

/**
 * Verilen bağlantı dizesiyle yeni bir Drizzle veritabanı örneği oluşturur.
 * `apps/api` gibi tüketiciler kendi env'lerinden bağlantıyı sağlar.
 */
export function createIamDb(connectionString: string): IamDb {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
});

export type IamDb = ReturnType<typeof drizzle<typeof schema>>;

/** `db.transaction` callback'ine verilen transaction handle tipi. */
export type IamTransaction = Parameters<Parameters<IamDb['transaction']>[0]>[0];

/** Repository'lerin çalışabileceği db veya transaction bağlamı. */
export type IamDbClient = IamDb | IamTransaction;
