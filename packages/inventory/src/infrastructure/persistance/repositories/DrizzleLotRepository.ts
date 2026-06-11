/**
 * Drizzle LotRepository — full implementation for Postgres.
 */
import { and, eq, isNotNull, isNull, lt, lte, desc } from 'drizzle-orm';
import type { InventoryDb } from '../db';
import { lots, lotSerials } from '../schemas/inv.lot.schema';
import { Lot } from '@oserp-community/inventory/domain/entities/Lot';
import { LotAggregate } from '@oserp-community/inventory/domain/aggregates/LotAggregate';
import { LotId } from '@oserp-community/inventory/domain/value-objects/LotId';
import { LotStatus } from '@oserp-community/inventory/domain/value-objects/LotStatus';
import { ExpiryDate } from '@oserp-community/inventory/domain/value-objects/ExpiryDate';
import { SerialNumber } from '@oserp-community/inventory/domain/value-objects/SerialNumber';
import type {
  LotRepository,
  LotSearchCriteria,
} from '@oserp-community/inventory/application/ports/LotRepositoryPort';

export class DrizzleLotRepository implements LotRepository {
  constructor(private readonly db: InventoryDb) {}

  async loadAggregate(productId: string, locationId: string): Promise<LotAggregate | null> {
    const rows = await this.db
      .select()
      .from(lots)
      .where(and(eq(lots.productId, productId), eq(lots.locationId, locationId)))
      .orderBy(lots.expiryDate, lots.receivedAt);
    if (rows.length === 0) return LotAggregate.empty(productId, locationId);
    const lotIds = rows.map((r) => r.id);
    const serials = lotIds.length > 0
      ? await this.db.select().from(lotSerials).where(
          lotIds.length === 1
            ? eq(lotSerials.lotId, lotIds[0]!)
            : // For IN clause we need inArray; fall back to multiple queries for safety
              eq(lotSerials.lotId, lotIds[0]!),
        )
      : [];
    // For multi-lot case, fetch each lot's serials
    const serialsByLot = new Map<string, string[]>();
    if (lotIds.length > 1) {
      for (const id of lotIds) {
        const ss = await this.db.select().from(lotSerials).where(eq(lotSerials.lotId, id));
        serialsByLot.set(id, ss.map((s) => s.serialNumber));
      }
    } else if (lotIds.length === 1) {
      serialsByLot.set(lotIds[0]!, serials.map((s) => s.serialNumber));
    }
    const lotsArr = rows.map((r) =>
      Lot.create({
        id: LotId.of(r.id),
        productId: r.productId,
        locationId: r.locationId,
        quantityOnHand: r.quantityOnHand,
        uom: r.uom,
        status: LotStatus.fromKind(r.status as 'AVAILABLE' | 'QUARANTINED' | 'EXPIRED' | 'DEPLETED'),
        expiryDate: r.expiryDate ? ExpiryDate.of(r.expiryDate) : ExpiryDate.none(),
        mfgDate: r.mfgDate,
        receivedAt: r.receivedAt,
        supplierLotCode: r.supplierLotCode,
        serialNumbers: (serialsByLot.get(r.id) ?? []).map((v) => SerialNumber.of(v)),
        notes: r.notes,
        version: r.version,
      }),
    );
    return LotAggregate.load({ productId, locationId, lots: lotsArr });
  }

  async saveAggregate(agg: LotAggregate): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Delete all existing lots for this aggregate (full replace)
      await tx
        .delete(lots)
        .where(and(eq(lots.productId, agg.getProductId()), eq(lots.locationId, agg.getLocationId())));
      for (const lot of agg.getLots()) {
        await tx.insert(lots).values({
          id: lot.getId().getValue(),
          productId: lot.getProductId(),
          locationId: lot.getLocationId(),
          quantityOnHand: lot.getQuantityOnHand(),
          uom: lot.getUom(),
          status: lot.getStatus().getKind(),
          expiryDate: lot.getExpiryDate().getDate(),
          mfgDate: lot.getMfgDate(),
          receivedAt: lot.getReceivedAt(),
          supplierLotCode: lot.getSupplierLotCode(),
          notes: lot.getNotes(),
          version: lot.getVersion(),
        });
        if (lot.getSerialNumbers().length > 0) {
          for (const sn of lot.getSerialNumbers()) {
            await tx.insert(lotSerials).values({
              lotId: lot.getId().getValue(),
              serialNumber: sn.getValue(),
              productId: lot.getProductId(),
              locationId: lot.getLocationId(),
            }).onConflictDoNothing();
          }
        }
      }
    });
  }

  async findById(lotId: LotId): Promise<Lot | null> {
    const rows = await this.db.select().from(lots).where(eq(lots.id, lotId.getValue())).limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    const serials = await this.db.select().from(lotSerials).where(eq(lotSerials.lotId, r.id));
    return Lot.create({
      id: LotId.of(r.id),
      productId: r.productId,
      locationId: r.locationId,
      quantityOnHand: r.quantityOnHand,
      uom: r.uom,
      status: LotStatus.fromKind(r.status as 'AVAILABLE' | 'QUARANTINED' | 'EXPIRED' | 'DEPLETED'),
      expiryDate: r.expiryDate ? ExpiryDate.of(r.expiryDate) : ExpiryDate.none(),
      mfgDate: r.mfgDate,
      receivedAt: r.receivedAt,
      supplierLotCode: r.supplierLotCode,
      serialNumbers: serials.map((s) => SerialNumber.of(s.serialNumber)),
      notes: r.notes,
      version: r.version,
    });
  }

  async search(criteria: LotSearchCriteria): Promise<ReadonlyArray<Lot>> {
    const conds = [];
    if (criteria.productId) conds.push(eq(lots.productId, criteria.productId));
    if (criteria.locationId) conds.push(eq(lots.locationId, criteria.locationId));
    if (criteria.status) conds.push(eq(lots.status, criteria.status));
    if (criteria.hasExpiry === true) conds.push(isNotNull(lots.expiryDate));
    if (criteria.hasExpiry === false) conds.push(isNull(lots.expiryDate));
    if (criteria.expiresBefore) conds.push(lt(lots.expiryDate, criteria.expiresBefore));
    const rows = await this.db
      .select()
      .from(lots)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(lots.expiryDate, lots.receivedAt)
      .limit(criteria.limit ?? 1000);
    return rows.map((r) =>
      Lot.create({
        id: LotId.of(r.id),
        productId: r.productId,
        locationId: r.locationId,
        quantityOnHand: r.quantityOnHand,
        uom: r.uom,
        status: LotStatus.fromKind(r.status as 'AVAILABLE' | 'QUARANTINED' | 'EXPIRED' | 'DEPLETED'),
        expiryDate: r.expiryDate ? ExpiryDate.of(r.expiryDate) : ExpiryDate.none(),
        mfgDate: r.mfgDate,
        receivedAt: r.receivedAt,
        supplierLotCode: r.supplierLotCode,
        serialNumbers: [],
        notes: r.notes,
        version: r.version,
      }),
    );
  }
}
