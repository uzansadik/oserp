import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const iamApiCredentials = pgTable(
  'iam_api_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id').notNull(),

    name: varchar('name', { length: 100 }).notNull(),
    prefix: varchar('prefix', { length: 8 }).notNull(),
    secretHash: text('secret_hash').notNull(),

    status: varchar('status', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastRotatedAt: timestamp('last_rotated_at', { withTimezone: true }),
  },
  (table) => ({
    prefixUnique: uniqueIndex('iam_api_credentials_prefix_unique').on(table.prefix),
    companyIdx: index('iam_api_credentials_company_idx').on(table.companyId),
  }),
);
