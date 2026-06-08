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
});

export const serviceEvents = sqliteTable('service_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceName: text('service_name').notNull(),
  kind: text('kind').notNull(),
  payloadJson: text('payload_json').notNull().default('{}'),
  at: integer('at', { mode: 'timestamp_ms' })
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
