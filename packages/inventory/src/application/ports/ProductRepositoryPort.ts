import type { Product } from '../../domain/entities/Product';
import type { ProductId } from '../../domain/value-objects/ProductId';
import type { ProductStatusVO } from '../../domain/value-objects/ProductStatus';
import type { ProductTypeVO } from '../../domain/value-objects/ProductType';
import type { Sku } from '../../domain/value-objects/Sku';

/**
 * Ürün listeleme için sayfalama/filtre kriterleri.
 */
export type ListProductsFilter = {
  sku?: string;
  type?: ProductTypeVO;
  status?: ProductStatusVO;
  categoryId?: string;
  search?: string; // name/description içinde arama (LIKE)
  limit?: number;
  offset?: number;
};

export type ListProductsResult = {
  products: ReadonlyArray<Product>;
  total: number;
};

export interface ProductRepositoryPort {
  /** Yeni ürün kaydeder (insert). */
  save(product: Product): Promise<void>;
  /** Mevcut ürünü günceller (optimistic lock ile). */
  update(product: Product): Promise<void>;
  findById(id: ProductId): Promise<Product | null>;
  findBySku(sku: Sku): Promise<Product | null>;
  list(filter: ListProductsFilter): Promise<ListProductsResult>;
  /** Verilen SKU'ya sahip ürün var mı? (CreateProduct uniqueness kontrolü). */
  existsBySku(sku: Sku): Promise<boolean>;
  /** Verilen ID'ye sahip ürün var mı? */
  existsById(id: ProductId): Promise<boolean>;
}
