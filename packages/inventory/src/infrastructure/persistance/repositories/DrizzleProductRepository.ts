import type { Product } from '@oserp-community/inventory/domain/entities/Product';
import type { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import type { Sku } from '@oserp-community/inventory/domain/value-objects/Sku';
import type {
  ListProductsFilter,
  ListProductsResult,
  ProductRepositoryPort,
} from '@oserp-community/inventory/application/ports/ProductRepositoryPort';
import { and, count, eq, ilike, sql } from 'drizzle-orm';
import type { InventoryDbClient } from '../db';
import { barcodeToPersistence, productRowToDomain, productToPersistence } from '../mappers/ProductMapper';
import { invProductBarcodes, invProducts } from '../schemas';

/**
 * Drizzle tabanlı ürün repository'si. Hem db hem transaction handle'ı ile
 * çalışabilir (UnitOfWork'ten geçen transaction'ı kabul eder).
 */
export class DrizzleProductRepository implements ProductRepositoryPort {
  constructor(private readonly db: InventoryDbClient) {}

  async save(product: Product): Promise<void> {
    const data = productToPersistence(product);
    await this.db.insert(invProducts).values(data);

    // Barkodları ayrı ekle
    const barcodes = product.getBarcodes();
    if (barcodes.length > 0) {
      await this.db
        .insert(invProductBarcodes)
        .values(barcodes.map((b) => barcodeToPersistence(data.id, b)));
    }
  }

  async update(product: Product): Promise<void> {
    const data = productToPersistence(product);
    await this.db
      .update(invProducts)
      .set({
        name: data.name,
        description: data.description,
        type: data.type,
        procurementPolicy: data.procurementPolicy,
        trackingType: data.trackingType,
        baseUom: data.baseUom,
        categoryId: data.categoryId,
        status: data.status,
        minQty: data.minQty,
        maxQty: data.maxQty,
        reorderQty: data.reorderQty,
        safetyStock: data.safetyStock,
        updatedAt: data.updatedAt,
        version: data.version + 1,
      })
      .where(eq(invProducts.id, data.id));

    // Barkodları tam senkronize et (basit yaklaşım: sil + yeniden ekle)
    await this.db.delete(invProductBarcodes).where(eq(invProductBarcodes.productId, data.id));
    const barcodes = product.getBarcodes();
    if (barcodes.length > 0) {
      await this.db
        .insert(invProductBarcodes)
        .values(barcodes.map((b) => barcodeToPersistence(data.id, b)));
    }
  }

  async findById(id: ProductId): Promise<Product | null> {
    const row = await this.db.query.invProducts.findFirst({
      where: eq(invProducts.id, id.toString()),
    });
    if (!row) return null;
    const barcodeRows = await this.db
      .select()
      .from(invProductBarcodes)
      .where(eq(invProductBarcodes.productId, row.id));
    return productRowToDomain(row, barcodeRows);
  }

  async findBySku(sku: Sku): Promise<Product | null> {
    const row = await this.db.query.invProducts.findFirst({
      where: eq(invProducts.sku, sku.getValue()),
    });
    if (!row) return null;
    const barcodeRows = await this.db
      .select()
      .from(invProductBarcodes)
      .where(eq(invProductBarcodes.productId, row.id));
    return productRowToDomain(row, barcodeRows);
  }

  async list(filter: ListProductsFilter): Promise<ListProductsResult> {
    const conditions = [];
    if (filter.sku) conditions.push(eq(invProducts.sku, filter.sku.toUpperCase()));
    if (filter.type) conditions.push(eq(invProducts.type, filter.type.getValue()));
    if (filter.status) conditions.push(eq(invProducts.status, filter.status.getValue()));
    if (filter.categoryId) conditions.push(eq(invProducts.categoryId, filter.categoryId));
    if (filter.search) {
      conditions.push(
        sql`(${invProducts.name} ILIKE ${'%' + filter.search + '%'} OR ${invProducts.description} ILIKE ${'%' + filter.search + '%'})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ value: count() })
      .from(invProducts)
      .where(where ?? sql`true`);
    const total = totalResult[0]?.value ?? 0;

    const rows = await this.db.query.invProducts.findMany({
      where,
      limit: filter.limit,
      offset: filter.offset,
      orderBy: (p, { asc }) => [asc(p.sku)],
    });

    // Barkodları toplu çek
    const productIds = rows.map((r) => r.id);
    const barcodeRows = productIds.length
      ? await this.db
          .select()
          .from(invProductBarcodes)
          .where(sql`${invProductBarcodes.productId} = ANY(${productIds})`)
      : [];
    const barcodesByProduct = new Map<string, typeof barcodeRows>();
    for (const b of barcodeRows) {
      const arr = barcodesByProduct.get(b.productId) ?? [];
      arr.push(b);
      barcodesByProduct.set(b.productId, arr);
    }

    return {
      products: rows.map((r) => productRowToDomain(r, barcodesByProduct.get(r.id) ?? [])),
      total: total ?? 0,
    };
  }

  async existsBySku(sku: Sku): Promise<boolean> {
    const [row] = await this.db
      .select({ id: invProducts.id })
      .from(invProducts)
      .where(eq(invProducts.sku, sku.getValue()))
      .limit(1);
    return row !== undefined;
  }

  async existsById(id: ProductId): Promise<boolean> {
    const [row] = await this.db
      .select({ id: invProducts.id })
      .from(invProducts)
      .where(eq(invProducts.id, id.toString()))
      .limit(1);
    return row !== undefined;
  }
}
