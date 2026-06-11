import type { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';
import { InventoryLevel as InventoryLevelAggregate } from '@oserp-community/inventory/domain/entities/InventoryLevel';
import type { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import type { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import type { LotRef } from '@oserp-community/inventory/domain/value-objects/LotRef';
import { ProductId as ProductIdVO } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef as LocationRefVO } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { LotRef as LotRefVO } from '@oserp-community/inventory/domain/value-objects/LotRef';
import { Quantity } from '@oserp-community/inventory/domain/value-objects/Quantity';
import { ReorderStatusVO } from '@oserp-community/inventory/domain/value-objects/ReorderStatus';
import { ValuationSnapshot } from '@oserp-community/inventory/domain/value-objects/ValuationSnapshot';
import { and, count, eq } from 'drizzle-orm';
import type {
  InventoryLevelRepositoryPort,
  ListLowStockResult,
} from '@oserp-community/inventory/application/ports/InventoryLevelRepositoryPort';
import type { InventoryDbClient } from '../db';
import { invInventoryLevels, type InvInventoryLevelRow } from '../schemas/inv.inventory-level.schema';

function rowToLevel(row: InvInventoryLevelRow): InventoryLevel {
  return InventoryLevelAggregate.reconstitute({
    productId: ProductIdVO.create(row.productId),
    location: LocationRefVO.create(row.locationId, null),
    lotRef: row.lotId ? LotRefVO.create(row.lotId) : null,
    quantity: Quantity.create(row.onHand, row.reserved, row.inTransit),
    valuation: ValuationSnapshot.empty(),
    reorderStatus: ReorderStatusVO.create(row.reorderStatus),
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class DrizzleInventoryLevelRepository implements InventoryLevelRepositoryPort {
  constructor(private readonly db: InventoryDbClient) {}

  async save(level: InventoryLevel): Promise<void> {
    const l = level;
    const q = l.getQuantity();
    const totalValue = l.getValuation().getTotalValue();
    await this.db.insert(invInventoryLevels).values({
      productId: l.getProductId().toString(),
      locationId: l.getLocation().getLocationId(),
      lotId: l.getLotRef() ? l.getLotRef()!.getLotId() : null,
      onHand: q.getOnHand(),
      reserved: q.getReserved(),
      inTransit: q.getInTransit(),
      totalValue: totalValue ? totalValue.toString() : null,
      reorderStatus: l.getReorderStatus().getValue(),
      version: l.getVersion(),
      createdAt: l.getCreatedAt(),
      updatedAt: l.getUpdatedAt(),
    });
  }

  async update(level: InventoryLevel): Promise<void> {
    const l = level;
    const q = l.getQuantity();
    const totalValue = l.getValuation().getTotalValue();
    const where = and(
      eq(invInventoryLevels.productId, l.getProductId().toString()),
      eq(invInventoryLevels.locationId, l.getLocation().getLocationId()),
      l.getLotRef() ? eq(invInventoryLevels.lotId, l.getLotRef()!.getLotId()) : eq(invInventoryLevels.lotId, null as unknown as string),
    );
    await this.db
      .update(invInventoryLevels)
      .set({
        onHand: q.getOnHand(),
        reserved: q.getReserved(),
        inTransit: q.getInTransit(),
        totalValue: totalValue ? totalValue.toString() : null,
        reorderStatus: l.getReorderStatus().getValue(),
        version: l.getVersion(),
        updatedAt: l.getUpdatedAt(),
      })
      .where(where);
  }

  async findByComposite(
    productId: ProductId,
    location: LocationRef,
    lotRef: LotRef | null,
  ): Promise<InventoryLevel | null> {
    const where = and(
      eq(invInventoryLevels.productId, productId.toString()),
      eq(invInventoryLevels.locationId, location.getLocationId()),
      lotRef ? eq(invInventoryLevels.lotId, lotRef.getLotId()) : eq(invInventoryLevels.lotId, null as unknown as string),
    );
    const row = await this.db.query.invInventoryLevels.findFirst({ where });
    return row ? rowToLevel(row) : null;
  }

  async findByProduct(productId: ProductId): Promise<ReadonlyArray<InventoryLevel>> {
    const rows = await this.db.query.invInventoryLevels.findMany({
      where: eq(invInventoryLevels.productId, productId.toString()),
    });
    return rows.map(rowToLevel);
  }

  async listByStatus(
    status: ReorderStatusVO,
    limit = 100,
    offset = 0,
  ): Promise<ListLowStockResult> {
    const where = eq(invInventoryLevels.reorderStatus, status.getValue());
    const rows = await this.db.query.invInventoryLevels.findMany({
      where,
      limit,
      offset,
    });
    const totalResult = await this.db
      .select({ value: count() })
      .from(invInventoryLevels)
      .where(where);
    return { levels: rows.map(rowToLevel), total: totalResult[0]?.value ?? 0 };
  }
}
