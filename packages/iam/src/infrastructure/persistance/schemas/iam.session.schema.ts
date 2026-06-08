import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { iamUsers } from './iam.user.schema';

export const iamSessions = pgTable(
  'iam_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => iamUsers.id, { onDelete: 'cascade' }),

    refreshTokenHash: text('refresh_token_hash').notNull(),
    status: varchar('status', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    refreshTokenHashUnique: uniqueIndex('iam_sessions_refresh_token_hash_unique').on(
      table.refreshTokenHash,
    ),
    userIdx: index('iam_sessions_user_idx').on(table.userId),
  }),
);
