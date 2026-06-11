/**
 * Drizzle schema: lots
 */
import { pgTable, varchar, integer, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

/**
 * lots — one row per lot (immutable batch)
 *
 * Identity is (productId + locationId + lotId) — same lot can be tracked
 * across movements. The aggregate (productId+locationId) owns the collection.
 */
export const lots = pgTable(
  'inv_lots',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    productId: varchar('product_id', { length: 64 }).notNull(),
    locationId: varchar('location_id', { length: 64 }).notNull(),
    quantityOnHand: varchar('quantity_on_hand', { length: 32 }).notNull(), // decimal string
    uom: varchar('uom', { length: 16 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('AVAILABLE'),
    expiryDate: timestamp('expiry_date', { withTimezone: true }),
    mfgDate: timestamp('mfg_date', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    supplierLotCode: varchar('supplier_lot_code', { length: 128 }),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    productLocationIdx: index('inv_lots_product_location_idx').on(t.productId, t.locationId),
    expiryIdx: index('inv_lots_expiry_idx').on(t.expiryDate),
    statusIdx: index('inv_lots_status_idx').on(t.status),
  }),
);

/**
 * lot_serials — one row per unit serial within a lot
 * Separate table so lots table stays compact and we can index by SN.
 */
export const lotSerials = pgTable(
  'inv_lot_serials',
  {
    lotId: varchar('lot_id', { length: 64 }).notNull(),
    serialNumber: varchar('serial_number', { length: 128 }).notNull(),
    productId: varchar('product_id', { length: 64 }).notNull(),
    locationId: varchar('location_id', { length: 64 }).notNull(),
    allocatedAt: timestamp('allocated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lotId, t.serialNumber] }),
    serialIdx: index('inv_lot_serials_serial_idx').on(t.serialNumber),
  }),
);
