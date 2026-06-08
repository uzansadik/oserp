import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const iamOutbox = pgTable(
  'iam_outbox',
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
    unpublishedIdx: index('iam_outbox_unpublished_idx').on(table.published, table.occurredOn),
    aggregateIdx: index('iam_outbox_aggregate_idx').on(table.aggregateId),
  }),
);
