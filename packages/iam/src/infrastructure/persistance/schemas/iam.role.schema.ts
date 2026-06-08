import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const iamRoles = pgTable(
  'iam_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id'),

    name: varchar('name', { length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    description: text('description'),

    isSystemRole: boolean('is_system_role').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyNameUnique: uniqueIndex('iam_roles_company_name_unique').on(table.companyId, table.name),
    companyIdx: index('iam_roles_company_idx').on(table.companyId),
  }),
);

export const iamRolePermissions = pgTable(
  'iam_role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => iamRoles.id, { onDelete: 'cascade' }),

    permissionCode: varchar('permission_code', { length: 200 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionCode] }),
    roleIdx: index('iam_role_permissions_role_idx').on(table.roleId),
  }),
);
