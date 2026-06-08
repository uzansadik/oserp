import 'server-only';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

import { runMigrations } from './migrate';
import * as schema from './schema';

export type BackofficeDb = LibSQLDatabase<typeof schema>;

type Holder = {
  db: BackofficeDb;
  client: Client;
};

const globalRef = globalThis as unknown as { __backofficeDb?: Promise<Holder> };

export function resolveDbPath(): string {
  const fromEnv = process.env['BACKOFFICE_DB_PATH'];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return process.env.NODE_ENV === 'production' ? '/data/backoffice.db' : '.data/backoffice.db';
}

async function init(): Promise<Holder> {
  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const client = createClient({ url: `file:${path}` });
  const db = drizzle(client, { schema });
  await runMigrations(client);
  return { db, client };
}

async function getHolder(): Promise<Holder> {
  if (!globalRef.__backofficeDb) {
    globalRef.__backofficeDb = init().catch((err) => {
      globalRef.__backofficeDb = undefined;
      throw err;
    });
  }
  return globalRef.__backofficeDb;
}

export async function getDb(): Promise<BackofficeDb> {
  return (await getHolder()).db;
}

export async function getDbClient(): Promise<Client> {
  return (await getHolder()).client;
}
