import 'server-only';
import type { Client } from '@libsql/client';

type Migration = {
  id: string;
  sql: string;
};

const MIGRATIONS: readonly Migration[] = [
  {
    id: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE TABLE IF NOT EXISTS services (
        name TEXT PRIMARY KEY,
        image TEXT NOT NULL,
        current_tag TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('installing','running','stopped','updating','failed')),
        last_started_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS service_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_service_events_service_name
        ON service_events(service_name);
    `,
  },
  {
    id: '0002_sessions',
    sql: `
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `,
  },
  {
    id: '0003_services_env',
    sql: `
      ALTER TABLE services ADD COLUMN env_json TEXT NOT NULL DEFAULT '{}';
    `,
  },
  {
    id: '0004_edge_and_domains',
    sql: `
      ALTER TABLE services ADD COLUMN domain TEXT;
      ALTER TABLE services ADD COLUMN tls_mode TEXT NOT NULL DEFAULT 'off'
        CHECK (tls_mode IN ('off','auto','self_signed'));
      ALTER TABLE services ADD COLUMN upstream_port INTEGER;

      CREATE TABLE IF NOT EXISTS edge_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        domain TEXT,
        tls_mode TEXT NOT NULL DEFAULT 'self_signed'
          CHECK (tls_mode IN ('off','auto','self_signed')),
        acme_email TEXT,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      );

      INSERT OR IGNORE INTO edge_config (id, tls_mode) VALUES (1, 'self_signed');
    `,
  },
];

export async function runMigrations(client: Client): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS backoffice_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);
  for (const migration of MIGRATIONS) {
    const existing = await client.execute({
      sql: 'SELECT id FROM backoffice_migrations WHERE id = ?',
      args: [migration.id],
    });
    if (existing.rows.length > 0) continue;
    await client.executeMultiple(migration.sql);
    await client.execute({
      sql: 'INSERT INTO backoffice_migrations (id) VALUES (?)',
      args: [migration.id],
    });
  }
}
