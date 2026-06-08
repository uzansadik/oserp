import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const iamPermissions = pgTable(
  'iam_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    module: varchar('module', { length: 50 }).notNull(),
    resource: varchar('resource', { length: 80 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),

    code: varchar('code', { length: 200 }).notNull(),

    description: text('description'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex('iam_permissions_code_unique').on(table.code),

    moduleResourceActionUnique: uniqueIndex('iam_permissions_module_resource_action_unique').on(
      table.module,
      table.resource,
      table.action,
    ),

    moduleIdx: index('iam_permissions_module_idx').on(table.module),
    resourceIdx: index('iam_permissions_resource_idx').on(table.resource),
    actionIdx: index('iam_permissions_action_idx').on(table.action),
  }),
);
