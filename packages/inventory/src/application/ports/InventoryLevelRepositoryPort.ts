import type { InventoryLevel } from '../../domain/entities/InventoryLevel';
import type { ProductId } from '../../domain/value-objects/ProductId';
import type { LocationRef } from '../../domain/value-objects/LocationRef';
import type { LotRef } from '../../domain/value-objects/LotRef';
import type { ReorderStatusVO } from '../../domain/value-objects/ReorderStatus';

export type ListLowStockResult = {
  levels: ReadonlyArray<InventoryLevel>;
  total: number;
};

export interface InventoryLevelRepositoryPort {
  save(level: InventoryLevel): Promise<void>;
  update(level: InventoryLevel): Promise<void>;
  findByComposite(productId: ProductId, location: LocationRef, lotRef: LotRef | null): Promise<InventoryLevel | null>;
  findByProduct(productId: ProductId): Promise<ReadonlyArray<InventoryLevel>>;
  listByStatus(status: ReorderStatusVO, limit?: number, offset?: number): Promise<ListLowStockResult>;
}
