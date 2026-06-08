import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { iamUsers } from './iam.user.schema';

export const iamMemberships = pgTable(
  'iam_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: uuid('user_id')
      .notNull()
      .references(() => iamUsers.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id').notNull(),

    status: varchar('status', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCompanyUnique: uniqueIndex('iam_memberships_user_company_unique').on(
      table.userId,
      table.companyId,
    ),
    userIdx: index('iam_memberships_user_idx').on(table.userId),
    companyIdx: index('iam_memberships_company_idx').on(table.companyId),
  }),
);

export const iamMembershipRoles = pgTable(
  'iam_membership_roles',
  {
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => iamMemberships.id, { onDelete: 'cascade' }),

    roleId: uuid('role_id').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.membershipId, table.roleId] }),
    membershipIdx: index('iam_membership_roles_membership_idx').on(table.membershipId),
  }),
);
