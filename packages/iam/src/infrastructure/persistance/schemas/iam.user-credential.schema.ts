import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { iamUsers } from './iam.user.schema';

export const iamUserCredentials = pgTable('iam_user_credentials', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => iamUsers.id, { onDelete: 'cascade' }),

  passwordHash: text('password_hash').notNull(),
  passwordUpdatedAt: timestamp('password_updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
});
