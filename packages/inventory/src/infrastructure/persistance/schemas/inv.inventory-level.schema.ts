import { pgTable, uuid, varchar, numeric, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { invProducts } from './inv.product.schema';

/**
 * inv.inventory_levels — Anlık stok seviyesi.
 * Composite identity: (productId, locationId, lotId?) — `lotId` NULL = "_" sentinel.
 * Optimistic lock: `version` kolonu.
 */
export const invInventoryLevels = pgTable(
  'inv_inventory_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    productId: uuid('product_id')
      .notNull()
      .references(() => invProducts.id, { onDelete: 'cascade' }),

    locationId: varchar('location_id', { length: 64 }).notNull(),
    lotId: uuid('lot_id'),

    onHand: numeric('on_hand', { precision: 18, scale: 6 }).notNull().default('0'),
    reserved: numeric('reserved', { precision: 18, scale: 6 }).notNull().default('0'),
    inTransit: numeric('in_transit', { precision: 18, scale: 6 }).notNull().default('0'),

    avgCost: numeric('avg_cost', { precision: 18, scale: 6 }),
    lastCost: numeric('last_cost', { precision: 18, scale: 6 }),
    totalValue: numeric('total_value', { precision: 18, scale: 6 }),

    reorderStatus: varchar('reorder_status', { length: 16 }).notNull().default('OUT'),

    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqLevel: uniqueIndex('inv_inventory_levels_uniq').on(
      table.productId,
      table.locationId,
      table.lotId,
    ),
    productIdx: index('inv_inventory_levels_product_idx').on(table.productId),
    statusIdx: index('inv_inventory_levels_status_idx').on(table.reorderStatus),
  }),
);

export type InvInventoryLevelRow = typeof invInventoryLevels.$inferSelect;
export type InvInventoryLevelInsert = typeof invInventoryLevels.$inferInsert;
