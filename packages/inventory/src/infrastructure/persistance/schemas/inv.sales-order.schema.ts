/**
 * Drizzle schema: sales_orders + order_lines + invoices + invoice_lines + payments
 */
import { pgTable, varchar, integer, numeric, text, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';

export const salesOrders = pgTable(
  'inv_sales_orders',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    orderNumber: varchar('order_number', { length: 64 }).notNull().unique(),
    customerId: varchar('customer_id', { length: 64 }).notNull(),
    customerGroupId: varchar('customer_group_id', { length: 64 }),
    status: varchar('status', { length: 16 }).notNull().default('DRAFT'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => ({
    customerIdx: index('inv_sales_orders_customer_idx').on(t.customerId),
    statusIdx: index('inv_sales_orders_status_idx').on(t.status),
  }),
);

export const orderLines = pgTable(
  'inv_order_lines',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    salesOrderId: varchar('sales_order_id', { length: 64 })
      .notNull()
      .references(() => salesOrders.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 64 }).notNull(),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSku: varchar('product_sku', { length: 64 }).notNull(),
    quantity: varchar('quantity', { length: 32 }).notNull(),
    uom: varchar('uom', { length: 16 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index('inv_order_lines_order_idx').on(t.salesOrderId),
    productIdx: index('inv_order_lines_product_idx').on(t.productId),
  }),
);

export const invoices = pgTable(
  'inv_invoices',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    invoiceNumber: varchar('invoice_number', { length: 64 }).notNull().unique(),
    salesOrderId: varchar('sales_order_id', { length: 64 }).notNull(),
    customerId: varchar('customer_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('DRAFT'),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    paidAmount: numeric('paid_amount', { precision: 18, scale: 4 }).notNull().default('0'),
    notes: text('notes'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
  },
  (t) => ({
    customerIdx: index('inv_invoices_customer_idx').on(t.customerId),
    orderIdx: index('inv_invoices_order_idx').on(t.salesOrderId),
    statusIdx: index('inv_invoices_status_idx').on(t.status),
    dueIdx: index('inv_invoices_due_idx').on(t.dueDate),
  }),
);

export const invoiceLines = pgTable(
  'inv_invoice_lines',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    orderLineId: varchar('order_line_id', { length: 64 }).notNull(),
    productId: varchar('product_id', { length: 64 }).notNull(),
    productName: varchar('product_name', { length: 255 }).notNull(),
    productSku: varchar('product_sku', { length: 64 }).notNull(),
    quantity: varchar('quantity', { length: 32 }).notNull(),
    uom: varchar('uom', { length: 16 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    taxPercent: numeric('tax_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    invoiceIdx: index('inv_invoice_lines_invoice_idx').on(t.invoiceId),
  }),
);

export const invoicePayments = pgTable(
  'inv_invoice_payments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    invoiceId: varchar('invoice_id', { length: 64 })
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    method: varchar('method', { length: 32 }).notNull(),
    reference: varchar('reference', { length: 128 }),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    invoiceIdx: index('inv_invoice_payments_invoice_idx').on(t.invoiceId),
  }),
);
