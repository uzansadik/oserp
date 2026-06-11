/**
 * Drizzle schema: price_lists + price_list_entries + exchange_rates
 */
import { pgTable, varchar, numeric, timestamp, integer, text, index, primaryKey } from 'drizzle-orm/pg-core';

/**
 * price_lists — aggregate header
 *
 * scopeKind: 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP'
 * scopeTargetId: customerId or groupId (null for GLOBAL)
 * status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
 * version: optimistic concurrency
 */
export const priceLists = pgTable(
  'inv_price_lists',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    scopeKind: varchar('scope_kind', { length: 32 }).notNull(),
    scopeTargetId: varchar('scope_target_id', { length: 64 }),
    baseCurrency: varchar('base_currency', { length: 3 }).notNull(),
    status: varchar('status', { length: 16 }).notNull().default('DRAFT'),
    version: integer('version').notNull().default(1),
    activeFrom: timestamp('active_from', { withTimezone: true }).notNull(),
    activeTo: timestamp('active_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => ({
    scopeIdx: index('inv_price_lists_scope_idx').on(t.scopeKind, t.scopeTargetId),
    statusIdx: index('inv_price_lists_status_idx').on(t.status),
  }),
);

/**
 * price_list_entries — immutable price records per product
 */
export const priceListEntries = pgTable(
  'inv_price_list_entries',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    priceListId: varchar('price_list_id', { length: 64 }).notNull().references(() => priceLists.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 64 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    discountKind: varchar('discount_kind', { length: 32 }).notNull().default('NONE'),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }),
    discountFixedAmount: numeric('discount_fixed_amount', { precision: 18, scale: 4 }),
    overridePrice: numeric('override_price', { precision: 18, scale: 4 }),
    minQuantity: integer('min_quantity').notNull().default(1),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    listProductIdx: index('inv_pelist_product_idx').on(t.priceListId, t.productId),
    productIdx: index('inv_pelist_product_only_idx').on(t.productId),
  }),
);

/**
 * exchange_rates — FX rate history
 */
export const exchangeRates = pgTable(
  'inv_exchange_rates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
    toCurrency: varchar('to_currency', { length: 3 }).notNull(),
    rate: numeric('rate', { precision: 18, scale: 8 }).notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    source: varchar('source', { length: 32 }).notNull().default('MANUAL'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairIdx: index('inv_fx_pair_idx').on(t.fromCurrency, t.toCurrency, t.effectiveFrom),
  }),
);
