import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const iamUsers = pgTable(
  'iam_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),

    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 20 }).notNull(),

    status: varchar('status', { length: 20 }).notNull(),
    isEmailVerified: boolean('is_email_verified').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('iam_users_email_unique').on(table.email),
    usernameUnique: uniqueIndex('iam_users_username_unique').on(table.username),
    statusIdx: index('iam_users_status_idx').on(table.status),
  }),
);
