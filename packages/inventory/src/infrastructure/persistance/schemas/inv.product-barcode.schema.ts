import { pgTable, uuid, varchar, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { invProducts } from './inv.product.schema';

/**
 * inv.product_barcodes — Bir ürüne ait barkodlar.
 *
 * `code` global unique (her barkod tek bir ürüne bağlanır).
 * `is_primary` aggregate içinde enforce edilir; Product.addBarcode ilk eklenen
 * barkodu otomatik primary yapar.
 */
export const invProductBarcodes = pgTable(
  'inv_product_barcodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    productId: uuid('product_id')
      .notNull()
      .references(() => invProducts.id, { onDelete: 'cascade' }),

    code: varchar('code', { length: 64 }).notNull(),
    symbology: varchar('symbology', { length: 16 }).notNull().default('CUSTOM'),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (table) => ({
    codeUnique: uniqueIndex('inv_product_barcodes_code_uniq').on(table.code),
    productIdx: index('inv_product_barcodes_product_idx').on(table.productId),
  }),
);

export type InvProductBarcodeRow = typeof invProductBarcodes.$inferSelect;
export type InvProductBarcodeInsert = typeof invProductBarcodes.$inferInsert;
