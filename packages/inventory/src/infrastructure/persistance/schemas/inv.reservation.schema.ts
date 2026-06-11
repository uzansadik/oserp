// packages/inventory/src/infrastructure/persistance/schemas/inv.reservation.schema.ts
//
// Reservation aggregate'ın DB karşılığı. Bir reservation'ın birden fazla
// satırı olabilir; her satır (productId+locationId+lotId?) kombinasyonu.
//
// reservation_lines.lot_allocations JSONB olarak saklanır (FEFO breakdown).

import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const reservations = pgTable(
  'inv_reservations',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull(),
    customerId: text('customer_id').notNull(),
    status: text('status').notNull(), // HELD | COMMITTED | RELEASED | EXPIRED
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    committedAt: timestamp('committed_at', { withTimezone: true }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
  },
  (t) => ({
    orderIdx: uniqueIndex('inv_reservations_order_uniq').on(t.orderId),
    customerIdx: index('inv_reservations_customer_idx').on(t.customerId),
    statusIdx: index('inv_reservations_status_idx').on(t.status),
  }),
);

export const reservationLines = pgTable(
  'inv_reservation_lines',
  {
    id: text('id').primaryKey(),
    reservationId: text('reservation_id')
      .notNull()
      .references(() => reservations.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    locationId: text('location_id').notNull(),
    lotId: text('lot_id'), // MVP'de FEFO'nun seçtiği lot
    quantity: text('quantity').notNull(), // decimal string
    uom: text('uom').notNull(),
    lotAllocations: jsonb('lot_allocations')
      .notNull()
      .$type<Array<{ lotId: string | null; quantity: string }>>(),
    notes: text('notes'),
  },
  (t) => ({
    resIdx: index('inv_reservation_lines_res_idx').on(t.reservationId),
    prodLocIdx: index('inv_reservation_lines_prodloc_idx').on(t.productId, t.locationId),
  }),
);

export type InvReservationRow = typeof reservations.$inferSelect;
export type InvReservationInsert = typeof reservations.$inferInsert;
export type InvReservationLineRow = typeof reservationLines.$inferSelect;
export type InvReservationLineInsert = typeof reservationLines.$inferInsert;
