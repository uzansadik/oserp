import { pgTable, uuid, varchar, text, timestamp, integer, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * inv.products — Ürün kataloğu (master data).
 *
 * Invariantlar (domain VO'larda zorlanır):
 *  - sku unique
 *  - type, procurementPolicy, trackingType, status enum kısıtı
 *  - reorder qty alanları opsiyonel; verilirse >= 0
 */
export const invProducts = pgTable(
  'inv_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    sku: varchar('sku', { length: 64 }).notNull(),
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 32 }).notNull(),
    procurementPolicy: varchar('procurement_policy', { length: 32 }).notNull(),
    trackingType: varchar('tracking_type', { length: 16 }).notNull().default('NONE'),
    baseUom: varchar('base_uom', { length: 16 }).notNull().default('UNT'),

    categoryId: uuid('category_id'),
    status: varchar('status', { length: 16 }).notNull().default('ACTIVE'),

    // Reorder policy (string tutulur; domain VO validate eder)
    minQty: numeric('min_qty', { precision: 18, scale: 6 }),
    maxQty: numeric('max_qty', { precision: 18, scale: 6 }),
    reorderQty: numeric('reorder_qty', { precision: 18, scale: 6 }),
    safetyStock: numeric('safety_stock', { precision: 18, scale: 6 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => ({
    skuUnique: uniqueIndex('inv_products_sku_uniq').on(table.sku),
    typeIdx: index('inv_products_type_idx').on(table.type),
    statusIdx: index('inv_products_status_idx').on(table.status),
    categoryIdx: index('inv_products_category_idx').on(table.categoryId),
  }),
);

export type InvProductRow = typeof invProducts.$inferSelect;
export type InvProductInsert = typeof invProducts.$inferInsert;
