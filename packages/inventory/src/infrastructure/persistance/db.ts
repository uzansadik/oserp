// packages/inventory/src/infrastructure/persistance/db.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schemas';

/**
 * Verilen bağlantı dizesiyle yeni bir Drizzle veritabanı örneği oluşturur.
 * `apps/api` gibi tüketiciler kendi env'lerinden bağlantıyı sağlar.
 */
export function createInventoryDb(connectionString: string): InventoryDb {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
});

export type InventoryDb = ReturnType<typeof drizzle<typeof schema>>;

/** `db.transaction` callback'ine verilen transaction handle tipi. */
export type InventoryTransaction = Parameters<Parameters<InventoryDb['transaction']>[0]>[0];

/** Repository'lerin çalışabileceği db veya transaction bağlamı. */
export type InventoryDbClient = InventoryDb | InventoryTransaction;
