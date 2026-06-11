import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * inv.outbox — Transactional Outbox.
 *
 * Aggregate'i değiştiren aynı transaction içinde event satırları yazılır.
 * `OutboxPublisher` periyodik olarak `published=false` satırları okuyup
 * event bus'a yayar ve `published=true` işaretler.
 */
export const invOutbox = pgTable(
  'inv_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    eventName: varchar('event_name', { length: 100 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: text('payload').notNull(),

    occurredOn: timestamp('occurred_on', { withTimezone: true }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    published: boolean('published').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unpublishedIdx: index('inv_outbox_unpublished_idx').on(table.published, table.occurredOn),
    aggregateIdx: index('inv_outbox_aggregate_idx').on(table.aggregateId),
  }),
);

export type InvOutboxRow = typeof invOutbox.$inferSelect;
export type InvOutboxInsert = typeof invOutbox.$inferInsert;
