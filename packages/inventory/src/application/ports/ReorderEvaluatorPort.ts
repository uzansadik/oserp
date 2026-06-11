import type { ProductId } from '../../domain/value-objects/ProductId';
import type { InventoryLevel } from '../../domain/entities/InventoryLevel';
import type { ReorderPolicy } from '../../domain/value-objects/ReorderPolicy';
import type { ReorderStatusVO } from '../../domain/value-objects/ReorderStatus';

/**
 * ReorderEvaluator — Stock level + Reorder policy → Reorder status.
 * Dış servise bağımlı değildir; sadece level ve policy ile hesaplar.
 */
export interface ReorderEvaluator {
  evaluate(
    level: Pick<InventoryLevel, 'getQuantity'>,
    policy: ReorderPolicy | null,
  ): ReorderStatusVO;
}
