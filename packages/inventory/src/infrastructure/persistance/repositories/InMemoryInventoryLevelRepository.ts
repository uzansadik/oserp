import type { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';
import type { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import type { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import type { LotRef } from '@oserp-community/inventory/domain/value-objects/LotRef';
import type { ReorderStatusVO } from '@oserp-community/inventory/domain/value-objects/ReorderStatus';
import type {
  InventoryLevelRepositoryPort,
  ListLowStockResult,
} from '@oserp-community/inventory/application/ports/InventoryLevelRepositoryPort';

/**
 * In-memory InventoryLevel repository — test'ler için.
 * Composite key: `${productId}::${locationId}::${lotId|_}`.
 */
export class InMemoryInventoryLevelRepository implements InventoryLevelRepositoryPort {
  private readonly byKey = new Map<string, InventoryLevel>();

  private static keyOf(
    productId: ProductId,
    location: LocationRef,
    lotRef: LotRef | null,
  ): string {
    return `${productId.toString()}::${location.getLocationId()}::${lotRef ? lotRef.getLotId() : '_'}`;
  }

  async save(level: InventoryLevel): Promise<void> {
    this.byKey.set(InventoryLevelRepositoryMemory.key(level), level);
  }

  async update(level: InventoryLevel): Promise<void> {
    this.byKey.set(InventoryLevelRepositoryMemory.key(level), level);
  }

  async findByComposite(
    productId: ProductId,
    location: LocationRef,
    lotRef: LotRef | null,
  ): Promise<InventoryLevel | null> {
    return this.byKey.get(InMemoryInventoryLevelRepository.keyOf(productId, location, lotRef)) ?? null;
  }

  async findByProduct(productId: ProductId): Promise<ReadonlyArray<InventoryLevel>> {
    const result: InventoryLevel[] = [];
    for (const level of this.byKey.values()) {
      if (level.getProductId().toString() === productId.toString()) {
        result.push(level);
      }
    }
    return result;
  }

  async listByStatus(
    status: ReorderStatusVO,
    limit = 100,
    offset = 0,
  ): Promise<ListLowStockResult> {
    const filtered = Array.from(this.byKey.values()).filter(
      (l) => l.getReorderStatus().getValue() === status.getValue(),
    );
    return { levels: filtered.slice(offset, offset + limit), total: filtered.length };
  }
}

// Yardımcı sınıf: statik key fonksiyonu için
class InventoryLevelRepositoryMemory {
  static key(level: InventoryLevel): string {
    return InMemoryInventoryLevelRepository['keyOf'](
      level.getProductId(),
      level.getLocation(),
      level.getLotRef(),
    );
  }
}
