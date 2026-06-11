// packages/inventory/src/infrastructure/persistance/schemas/inv.transfer.schema.ts
//
// TransferOrder aggregate'ın DB karşılığı. Bir transfer'ın birden fazla
// satırı olabilir; her satır (productId+lotId?) kombinasyonu.

import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const transfers = pgTable(
  'inv_transfers',
  {
    id: text('id').primaryKey(),
    transferNumber: text('transfer_number').notNull(),
    sourceLocationId: text('source_location_id').notNull(),
    destinationLocationId: text('destination_location_id').notNull(),
    status: text('status').notNull(), // DRAFT | DISPATCHED | IN_TRANSIT | RECEIVED | CLOSED | CANCELLED
    reason: text('reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
  },
  (t) => ({
    numberIdx: index('inv_transfers_number_idx').on(t.transferNumber),
    sourceIdx: index('inv_transfers_source_idx').on(t.sourceLocationId),
    destIdx: index('inv_transfers_dest_idx').on(t.destinationLocationId),
    statusIdx: index('inv_transfers_status_idx').on(t.status),
  }),
);

export const transferLines = pgTable(
  'inv_transfer_lines',
  {
    id: text('id').primaryKey(),
    transferId: text('transfer_id')
      .notNull()
      .references(() => transfers.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    lotId: text('lot_id'), // Requested lot (DTO'dan)
    selectedLotId: text('selected_lot_id'), // FEFO'nun seçtiği (dispatch sırasında)
    requestedQuantity: text('requested_quantity').notNull(),
    dispatchedQuantity: text('dispatched_quantity').notNull().default('0'),
    receivedQuantity: text('received_quantity').notNull().default('0'),
    uom: text('uom').notNull(),
    notes: text('notes'),
  },
  (t) => ({
    resIdx: index('inv_transfer_lines_res_idx').on(t.transferId),
    prodIdx: index('inv_transfer_lines_prod_idx').on(t.productId),
  }),
);

export type InvTransferRow = typeof transfers.$inferSelect;
export type InvTransferInsert = typeof transfers.$inferInsert;
export type InvTransferLineRow = typeof transferLines.$inferSelect;
export type InvTransferLineInsert = typeof transferLines.$inferInsert;
