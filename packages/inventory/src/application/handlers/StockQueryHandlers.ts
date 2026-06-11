import { NotFoundError } from '../../domain/errors/NotFoundError';
import { ProductId } from '../../domain/value-objects/ProductId';
import { LocationRef } from '../../domain/value-objects/LocationRef';
import { LotRef } from '../../domain/value-objects/LotRef';
import { MovementId } from '../../domain/value-objects/MovementId';
import { MovementTypeVO } from '../../domain/value-objects/MovementType';
import { ReorderStatusVO } from '../../domain/value-objects/ReorderStatus';
import {
  getStockLevelSchema,
  getStockMovementsSchema,
  getStockValuationSchema,
  listLowStockSchema,
} from '../queries/StockQueries';
import type { QueryHandler } from '../Handler';
import type {
  InventoryLevelRepositoryPort,
  ListLowStockResult,
} from '../ports/InventoryLevelRepositoryPort';
import type {
  ListMovementsFilter,
  ListMovementsResult,
  StockMovementRepositoryPort,
} from '../ports/StockMovementRepositoryPort';

export class GetStockLevelHandler
  implements QueryHandler<{ productId: string; locationId?: string; lotId?: string | null }, unknown>
{
  constructor(private readonly repo: InventoryLevelRepositoryPort) {}

  async execute(q: { productId: string; locationId?: string; lotId?: string | null }) {
    const parsed = getStockLevelSchema.parse(q);
    const productId = ProductId.create(parsed.productId);
    const location = LocationRef.create(parsed.locationId);
    const lotRef = parsed.lotId ? LotRef.create(parsed.lotId) : null;
    const level = await this.repo.findByComposite(productId, location, lotRef);
    if (!level) {
      throw new NotFoundError(
        'InventoryLevel',
        `${productId.toString()}/${location.getLocationId()}${lotRef ? '/' + lotRef.getLotId() : ''}`,
      );
    }
    return {
      productId: productId.toString(),
      locationId: location.getLocationId(),
      lotId: lotRef?.getLotId() ?? null,
      onHand: level.getQuantity().getOnHand(),
      reserved: level.getQuantity().getReserved(),
      inTransit: level.getQuantity().getInTransit(),
      available: level.getQuantity().getAvailable(),
      reorderStatus: level.getReorderStatus().getValue(),
      version: level.getVersion(),
      updatedAt: level.getUpdatedAt(),
    };
  }
}

export class GetStockMovementsHandler
  implements QueryHandler<Parameters<ListMovementsFilter['limit'] extends number ? unknown : never>, ListMovementsResult>
{
  constructor(private readonly repo: StockMovementRepositoryPort) {}

  async execute(q: unknown): Promise<ListMovementsResult> {
    const parsed = getStockMovementsSchema.parse(q);
    const filter: ListMovementsFilter = {
      limit: parsed.limit,
      offset: parsed.offset,
    };
    if (parsed.productId !== undefined) filter.productId = parsed.productId;
    if (parsed.type !== undefined) filter.type = MovementTypeVO.create(parsed.type);
    if (parsed.fromLocationId !== undefined) filter.fromLocationId = parsed.fromLocationId;
    if (parsed.toLocationId !== undefined) filter.toLocationId = parsed.toLocationId;
    if (parsed.from !== undefined) filter.from = new Date(parsed.from);
    if (parsed.to !== undefined) filter.to = new Date(parsed.to);
    return this.repo.list(filter);
  }
}

export class ListLowStockHandler
  implements QueryHandler<unknown, ListLowStockResult>
{
  constructor(private readonly repo: InventoryLevelRepositoryPort) {}

  async execute(q: unknown): Promise<ListLowStockResult> {
    const parsed = listLowStockSchema.parse(q);
    const status = ReorderStatusVO.create(parsed.status);
    return this.repo.listByStatus(status, parsed.limit, parsed.offset);
  }
}

export class GetStockValuationHandler
  implements QueryHandler<{ productId: string }, unknown>
{
  constructor(private readonly repo: InventoryLevelRepositoryPort) {}

  async execute(q: { productId: string }): Promise<unknown> {
    const parsed = getStockValuationSchema.parse(q);
    const productId = ProductId.create(parsed.productId);
    const levels = await this.repo.findByProduct(productId);

    // Toplam onHand + totalValue hesapla
    let totalOnHand = '0';
    const currency = (levels[0]?.getValuation().getTotalValue()?.getCurrency().getCode()) ?? 'TRY';
    let totalValue = '0';

    return {
      productId: productId.toString(),
      levels: levels.map((l) => ({
        locationId: l.getLocation().getLocationId(),
        lotId: l.getLotRef()?.getLotId() ?? null,
        onHand: l.getQuantity().getOnHand(),
        totalValue: l.getValuation().getTotalValue()?.toString() ?? null,
        currency,
      })),
      totalOnHand,
      totalValue,
      currency,
      asOf: new Date(),
    };
  }
}

// Yardımcı re-export
export { MovementId };
