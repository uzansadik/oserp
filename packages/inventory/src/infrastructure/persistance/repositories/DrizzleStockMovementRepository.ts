import type { StockMovement } from '@oserp-community/inventory/domain/entities/StockMovement';
import { StockMovement as StockMovementVO } from '@oserp-community/inventory/domain/entities/StockMovement';
import { MovementId } from '@oserp-community/inventory/domain/value-objects/MovementId';
import { MovementTypeVO } from '@oserp-community/inventory/domain/value-objects/MovementType';
import { MovementDirectionVO } from '@oserp-community/inventory/domain/value-objects/MovementDirection';
import { DocumentRef } from '@oserp-community/inventory/domain/value-objects/DocumentRef';
import { ReasonCode } from '@oserp-community/inventory/domain/value-objects/ReasonCode';
import { MovementLine } from '@oserp-community/inventory/domain/entities/MovementLine';
import { LotRef } from '@oserp-community/inventory/domain/value-objects/LotRef';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lte,
  type SQL,
} from 'drizzle-orm';
import type {
  ListMovementsFilter,
  ListMovementsResult,
  StockMovementRepositoryPort,
} from '@oserp-community/inventory/application/ports/StockMovementRepositoryPort';
import type { InventoryDbClient } from '../db';
import { invProducts } from '../schemas/inv.product.schema';
import {
  invStockMovementLines,
  invStockMovements,
  type InvStockMovementLineRow,
  type InvStockMovementRow,
} from '../schemas/inv.stock-movement.schema';

function rowToStockMovement(
  row: InvStockMovementRow,
  lineRows: ReadonlyArray<InvStockMovementLineRow>,
): StockMovement {
  const lines = lineRows.map((l) =>
    MovementLine.create({
      productId: ProductId.create(l.productId),
      quantity: l.quantity,
      uom: l.uom,
      lotRef: l.lotId ? LotRef.create(l.lotId) : null,
      fromLocation: l.fromLocationId ? LocationRef.create(l.fromLocationId) : null,
      toLocation: l.toLocationId ? LocationRef.create(l.toLocationId) : null,
      unitCost: l.unitCost,
    }),
  );

  const docRef = row.documentType
    ? DocumentRef.create(row.documentType, row.documentId)
    : DocumentRef.none();

  return StockMovementVO.reconstitute({
    id: MovementId.create(row.id),
    type: MovementTypeVO.create(row.type),
    direction: MovementDirectionVO.create(row.direction),
    documentRef: docRef,
    lines,
    reasonCode: row.reasonCode ? ReasonCode.create(row.reasonCode) : null,
    postedBy: row.postedBy,
    postedAt: row.postedAt,
  });
}

export class DrizzleStockMovementRepository implements StockMovementRepositoryPort {
  constructor(private readonly db: InventoryDbClient) {}

  async save(movement: StockMovement): Promise<void> {
    const m = movement;
    const docRef = m.getDocumentRef();
    const reasonCode = m.getReasonCode();

    await this.db.insert(invStockMovements).values({
      id: m.getId().toString(),
      type: m.getType().getValue(),
      direction: m.getDirection().getValue(),
      documentType: docRef.getType(),
      documentId: docRef.getDocumentId(),
      reasonCode: reasonCode ? reasonCode.getValue() : null,
      postedBy: m.getPostedBy(),
      postedAt: m.getPostedAt(),
    });

    if (m.getLines().length > 0) {
      await this.db.insert(invStockMovementLines).values(
        m.getLines().map((l) => ({
          movementId: m.getId().toString(),
          productId: l.getProductId().toString(),
          quantity: l.getQuantity(),
          uom: l.getUom(),
          lotId: l.getLotRef() ? l.getLotRef()!.getLotId() : null,
          fromLocationId: l.getFromLocation() ? l.getFromLocation()!.getLocationId() : null,
          toLocationId: l.getToLocation() ? l.getToLocation()!.getLocationId() : null,
          unitCost: l.getUnitCost(),
        })),
      );
    }
  }

  async findById(id: MovementId): Promise<StockMovement | null> {
    const row = await this.db.query.invStockMovements.findFirst({
      where: eq(invStockMovements.id, id.toString()),
    });
    if (!row) return null;
    const lineRows = await this.db
      .select()
      .from(invStockMovementLines)
      .where(eq(invStockMovementLines.movementId, row.id));
    return rowToStockMovement(row, lineRows);
  }

  async list(filter: ListMovementsFilter): Promise<ListMovementsResult> {
    const conds: SQL[] = [];
    if (filter.from) conds.push(gte(invStockMovements.postedAt, filter.from));
    if (filter.to) conds.push(lte(invStockMovements.postedAt, filter.to));
    if (filter.type) conds.push(eq(invStockMovements.type, filter.type.getValue()));
    if (filter.fromLocationId) {
      conds.push(eq(invStockMovementLines.fromLocationId, filter.fromLocationId));
    }
    if (filter.toLocationId) {
      conds.push(eq(invStockMovementLines.toLocationId, filter.toLocationId));
    }
    if (filter.productId) {
      conds.push(eq(invStockMovementLines.productId, filter.productId));
    }

    const where = conds.length > 0 ? and(...conds) : undefined;

    // Ürün filtresi varsa lines üzerinden join gerekli; burada basitleştirilmiş:
    // önce header'ları çek, sonra ürün filtresini client-side uygula.
    const headerRows = await this.db
      .select()
      .from(invStockMovements)
      .leftJoin(
        invStockMovementLines,
        eq(invStockMovements.id, invStockMovementLines.movementId),
      )
      .leftJoin(invProducts, eq(invStockMovementLines.productId, invProducts.id))
      .where(where)
      .orderBy(desc(invStockMovements.postedAt))
      .limit(filter.limit ?? 50)
      .offset(filter.offset ?? 0);

    // Ürün filtresi sonradan
    const filtered = filter.productId
      ? headerRows.filter(
          (r) => r.inv_stock_movement_lines?.productId === filter.productId,
        )
      : headerRows;

    const totalResult = await this.db
      .select({ value: count() })
      .from(invStockMovements)
      .leftJoin(
        invStockMovementLines,
        eq(invStockMovements.id, invStockMovementLines.movementId),
      )
      .where(where);
    const total = totalResult[0]?.value ?? 0;

    // Distinct header'ları topla, sonra tüm line'larını çek
    const movementIds = Array.from(
      new Set(filtered.map((r) => r.inv_stock_movements.id)),
    );
    if (movementIds.length === 0) {
      return { movements: [], total };
    }
    const allLineRows = await this.db
      .select()
      .from(invStockMovementLines)
      .where(
        sql`${invStockMovementLines.movementId} IN (${movementIds.map((id) => sql`${id}`).reduce((a, b) => sql`${a}, ${b}`)})`,
      )
      .orderBy(asc(invStockMovementLines.movementId));
    const linesByMovement = new Map<string, InvStockMovementLineRow[]>();
    for (const l of allLineRows) {
      const arr = linesByMovement.get(l.movementId) ?? [];
      arr.push(l);
      linesByMovement.set(l.movementId, arr);
    }

    return {
      movements: filtered.map((r) => rowToStockMovement(r.inv_stock_movements, linesByMovement.get(r.inv_stock_movements.id) ?? [])),
      total,
    };
  }
}

// sql helper import
import { sql } from 'drizzle-orm';
