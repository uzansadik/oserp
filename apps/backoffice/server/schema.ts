import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const adminUsers = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const services = sqliteTable('services', {
  name: text('name').primaryKey(),
  image: text('image').notNull(),
  currentTag: text('current_tag').notNull(),
  status: text('status', {
    enum: ['installing', 'running', 'stopped', 'updating', 'failed'],
  }).notNull(),
  lastStartedAt: integer('last_started_at', { mode: 'timestamp_ms' }),
  envJson: text('env_json').notNull().default('{}'),
  domain: text('domain'),
  tlsMode: text('tls_mode', { enum: ['off', 'auto', 'self_signed'] })
    .notNull()
    .default('off'),
  upstreamPort: integer('upstream_port'),
});

export const edgeConfig = sqliteTable('edge_config', {
  id: integer('id').primaryKey().default(1),
  domain: text('domain'),
  tlsMode: text('tls_mode', { enum: ['off', 'auto', 'self_signed'] })
    .notNull()
    .default('self_signed'),
  acmeEmail: text('acme_email'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const serviceEvents = sqliteTable('service_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceName: text('service_name').notNull(),
  kind: text('kind').notNull(),
  payloadJson: text('payload_json').notNull().default('{}'),
  at: integer('at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: integer('user_id').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type AdminUserRow = typeof adminUsers.$inferSelect;
export type NewAdminUserRow = typeof adminUsers.$inferInsert;
export type ServiceRow = typeof services.$inferSelect;
export type NewServiceRow = typeof services.$inferInsert;
export type ServiceEventRow = typeof serviceEvents.$inferSelect;
export type NewServiceEventRow = typeof serviceEvents.$inferInsert;
export type ServiceStatus = ServiceRow['status'];
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type EdgeConfigRow = typeof edgeConfig.$inferSelect;
export type NewEdgeConfigRow = typeof edgeConfig.$inferInsert;
export type TlsMode = ServiceRow['tlsMode'];
