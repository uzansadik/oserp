import type { Product } from '@oserp-community/inventory/domain/entities/Product';
import type { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import type { Sku } from '@oserp-community/inventory/domain/value-objects/Sku';
import type {
  ListProductsFilter,
  ListProductsResult,
  ProductRepositoryPort,
} from '@oserp-community/inventory/application/ports/ProductRepositoryPort';

/**
 * In-memory ürün repository'si. Test'ler ve dev ortamı içindir.
 * Aggregate instance'larını doğrudan bellekte tutar (Map).
 */
export class InMemoryProductRepository implements ProductRepositoryPort {
  private readonly byId = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.byId.set(product.getId().toString(), product);
  }

  async update(product: Product): Promise<void> {
    this.byId.set(product.getId().toString(), product);
  }

  async findById(id: ProductId): Promise<Product | null> {
    return this.byId.get(id.toString()) ?? null;
  }

  async findBySku(sku: Sku): Promise<Product | null> {
    for (const p of this.byId.values()) {
      if (p.getSku().getValue() === sku.getValue()) {
        return p;
      }
    }
    return null;
  }

  async list(filter: ListProductsFilter): Promise<ListProductsResult> {
    let arr = Array.from(this.byId.values());
    if (filter.sku) {
      const sku = filter.sku.toUpperCase();
      arr = arr.filter((p) => p.getSku().getValue() === sku);
    }
    if (filter.type) {
      arr = arr.filter((p) => p.getType().getValue() === filter.type!.getValue());
    }
    if (filter.status) {
      arr = arr.filter((p) => p.getStatus().getValue() === filter.status!.getValue());
    }
    if (filter.categoryId) {
      arr = arr.filter((p) => p.getCategoryId() === filter.categoryId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.getName().toLowerCase().includes(q) ||
          (p.getDescription()?.toLowerCase().includes(q) ?? false),
      );
    }
    arr.sort((a, b) => a.getSku().getValue().localeCompare(b.getSku().getValue()));
    const total = arr.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    return { products: arr.slice(offset, offset + limit), total };
  }

  async existsBySku(sku: Sku): Promise<boolean> {
    return (await this.findBySku(sku)) !== null;
  }

  async existsById(id: ProductId): Promise<boolean> {
    return this.byId.has(id.toString());
  }
}
