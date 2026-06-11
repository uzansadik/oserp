import { pgTable, uuid, varchar, text, timestamp, numeric, index } from 'drizzle-orm/pg-core';
import { invProducts } from './inv.product.schema';

/**
 * inv.stock_movements — Stok hareketi başlık (header).
 * Satırlar `inv_stock_movement_lines` tablosunda.
 */
export const invStockMovements = pgTable(
  'inv_stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    type: varchar('type', { length: 16 }).notNull(),         // MovementType
    direction: varchar('direction', { length: 8 }).notNull(),// MovementDirection

    documentType: varchar('document_type', { length: 32 }),
    documentId: varchar('document_id', { length: 64 }),

    reasonCode: varchar('reason_code', { length: 32 }),

    postedBy: uuid('posted_by').notNull(),                   // ref → iam/users
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    postedAtIdx: index('inv_stock_movements_posted_at_idx').on(table.postedAt),
    typeIdx: index('inv_stock_movements_type_idx').on(table.type),
    productIdx: index('inv_stock_movements_product_idx').on(table.documentId),
  }),
);

export type InvStockMovementRow = typeof invStockMovements.$inferSelect;
export type InvStockMovementInsert = typeof invStockMovements.$inferInsert;

/**
 * inv.stock_movement_lines — Bir harekete bağlı satırlar (1:N).
 */
export const invStockMovementLines = pgTable(
  'inv_stock_movement_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    movementId: uuid('movement_id')
      .notNull()
      .references(() => invStockMovements.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => invProducts.id),

    quantity: numeric('quantity', { precision: 18, scale: 6 }).notNull(),
    uom: varchar('uom', { length: 16 }).notNull().default('UNT'),

    lotId: uuid('lot_id'),                                    // ref → lots (Faz 4)

    fromLocationId: varchar('from_location_id', { length: 64 }),
    toLocationId: varchar('to_location_id', { length: 64 }),

    unitCost: numeric('unit_cost', { precision: 18, scale: 6 }),
    currency: varchar('currency', { length: 3 }),
  },
  (table) => ({
    movementIdx: index('inv_stock_movement_lines_movement_idx').on(table.movementId),
    productIdx: index('inv_stock_movement_lines_product_idx').on(table.productId),
  }),
);

export type InvStockMovementLineRow = typeof invStockMovementLines.$inferSelect;
export type InvStockMovementLineInsert = typeof invStockMovementLines.$inferInsert;
