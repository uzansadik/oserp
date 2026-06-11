/**
 * Service: ReservationService
 *
 * Sipariş (SalesOrder) onaylandığında çağrılır. Her bir sipariş satırı için:
 *
 *   1. Ürün+location için LotAggregate'ı yükle
 *   2. FEFO stratejisiyle lot'ları sırala
 *   3. Yeterli quantity'yi topla (lot bazında allocation)
 *   4. İlgili InventoryLevel aggregate'larını yükle ve reserved += qty yap
 *   5. Reservation aggregate'ı oluştur, persistance kaydet
 *   6. Event'leri outbox'a yaz
 *
 * Aynı zamanda commit() ve release() metodları:
 *   - commit:  invoice paid → reserved -= qty, onHand -= qty
 *   - release: order cancelled → reserved -= qty
 *
 * **Önemli:** InventoryLevel aggregate'ı session-internal'dır (Faz 2). Bu
 * servis, rezervasyonun gerçek stok etkisini uygulayan projection service
 * görevi görür; aynı LotRepository üzerinden de lot.quantityOnHand'i
 * (commit sırasında) azaltır.
 */
import { Reservation } from '../../domain/aggregates/Reservation';
import { ReservationLine } from '../../domain/entities/ReservationLine';
import { ReservationLineRef, ReservationId } from '../../domain/value-objects/ReservationId';
import { InventoryLevel } from '../../domain/entities/InventoryLevel';
import { ProductId } from '../../domain/value-objects/ProductId';
import { LocationRef } from '../../domain/value-objects/LocationRef';
import { LotRef } from '../../domain/value-objects/LotRef';
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import type { LotRepository } from '../ports/LotRepositoryPort';
import type { LotDispatchStrategy } from '../ports/LotDispatchStrategyPort';
import type { InventoryLevelRepositoryPort } from '../ports/InventoryLevelRepositoryPort';
import type { ReservationRepository } from '../ports/ReservationRepositoryPort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';
import type { ClockPort } from '../ports/ClockPort';
import type {
  CreateReservationDTO,
  ReleaseReservationDTO,
  CommitReservationDTO,
} from '../dto/ReservationDTOs';
import type { ReservationResult } from '../commands/ReservationCommands';

export class ReservationService {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly reservations: ReservationRepository,
    private readonly lots: LotRepository,
    private readonly levels: InventoryLevelRepositoryPort,
    private readonly dispatch: LotDispatchStrategy,
    private readonly clock: ClockPort,
  ) {}

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Yeni bir rezervasyon oluştur ve stok'u ayır (reserve).
   * Tüm işlem tek bir UoW transaction'ında yapılır.
   */
  async createReservation(dto: CreateReservationDTO): Promise<ReservationResult> {
    if (!dto.lines || dto.lines.length === 0) {
      return { ok: false, error: 'Reservation must have at least one line' };
    }

    // OrderId bazında mükerrer reservation engelleme
    const existing = await this.reservations.findByOrderId(dto.orderId);
    if (existing) {
      return {
        ok: false,
        error: `Reservation already exists for order ${dto.orderId}: ${existing.getId().getValue()}`,
      };
    }

    return this.uow.execute(async (ctx) => {
      // 1) Her line için lot allocation hesapla
      const reservationLines: ReservationLine[] = [];
      const unallocated: Array<{ productId: string; locationId: string; missing: string }> = [];
      const updatedLevels = new Map<string, InventoryLevel>();
      const updatedLotAggs = new Map<string, LotAggregate>();

      for (const line of dto.lines) {
        // Lot aggregate'ı yükle
        const aggKey = `${line.productId}@${line.locationId}`;
        let lotAgg =
          updatedLotAggs.get(aggKey) ??
          (await this.lots.loadAggregate(line.productId, line.locationId));
        if (!lotAgg) {
          unallocated.push({
            productId: line.productId,
            locationId: line.locationId,
            missing: line.quantity,
          });
          continue;
        }

        // FEFO dispatch
        const dispatchResult = lotAgg.dispatch(line.quantity, this.clock.now());
        if (Number(dispatchResult.remaining) > 0) {
          unallocated.push({
            productId: line.productId,
            locationId: line.locationId,
            missing: dispatchResult.remaining,
          });
          // Kısmi allocation yapma: ya tamamını ayır ya hiç. Burada hiç ayırma.
          continue;
        }

        // Allocation başarılı; lot'ları consume et
        let newAgg = lotAgg;
        for (const alloc of dispatchResult.allocations) {
          newAgg = newAgg.applyDispatch(alloc);
        }
        updatedLotAggs.set(aggKey, newAgg);

        // InventoryLevel'ı reserve et
        const levelKey = `${line.productId}::${line.locationId}::__null`;
        let level = updatedLevels.get(levelKey);
        if (!level) {
          level = await this.findOrCreateLevel(
            line.productId,
            line.locationId,
            null,
            ctx,
          );
        }
        level.applyReservation(line.quantity);
        updatedLevels.set(levelKey, level);

        // ReservationLine oluştur
        const lineRef = ReservationLineRef.of(
          line.productId,
          line.locationId,
          line.lotId ?? dispatchResult.allocations[0]?.lot.getId().getValue() ?? null,
        );
        const reservationLine = ReservationLine.create({
          ref: lineRef,
          reservedQuantity: line.quantity,
          uom: line.uom,
          lotAllocations: dispatchResult.allocations.map((a) => ({
            lotId: a.lot.getId().getValue(),
            quantity: a.quantity,
          })),
          notes: null,
        });
        reservationLines.push(reservationLine);
      }

      if (unallocated.length > 0) {
        // Herhangi bir satır ayrılamadıysa, hiçbir şeyi kalıcı yapma
        return {
          ok: false,
          error: 'Insufficient stock to fulfill reservation',
          unallocatedQuantity: unallocated
            .map((u) => `${u.productId}@${u.locationId}: -${u.missing}`)
            .join(', '),
        };
      }

      // 2) Reservation aggregate'ı oluştur
      const expiresAt =
        dto.expiresAt == null
          ? null
          : typeof dto.expiresAt === 'string'
            ? new Date(dto.expiresAt)
            : dto.expiresAt;

      const reservation = Reservation.create({
        id: dto.id,
        orderId: dto.orderId,
        customerId: dto.customerId,
        lines: reservationLines,
        expiresAt,
        notes: dto.notes ?? null,
      });

      // 3) Persistence — hepsi aynı transaction
      await ctx.reservations.save(reservation);
      for (const agg of updatedLotAggs.values()) {
        await this.lots.saveAggregate(agg);
      }
      for (const lvl of updatedLevels.values()) {
        await ctx.inventoryLevels.update(lvl);
      }

      // 4) Event'leri outbox'a yaz
      const events: import('../../interfaces/IDomainEvent').default[] = [];
      events.push(...reservation.pullDomainEvents());
      for (const lvl of updatedLevels.values()) {
        events.push(...lvl.pullDomainEvents());
      }
      await ctx.outbox.enqueue(events);

      // Reservation'ı tekrar yükle (in-memory persistence için değilse; ref'i döndür)
      const { reservationToView } = await import('../dto/ReservationDTOs');
      return {
        ok: true,
        reservation: reservationToView(reservation),
      };
    });
  }

  /**
   * Reservation'ı commit et (invoice paid → stok gerçekten sevkedildi).
   * InventoryLevel: onHand -= qty, reserved -= qty.
   * LotAggregate: lot.quantityOnHand -= qty (consume).
   */
  async commitReservation(dto: CommitReservationDTO): Promise<ReservationResult> {
    return this.uow.execute(async (ctx) => {
      const reservation = await ctx.reservations.findById(ReservationId.of(dto.reservationId));
      if (!reservation) {
        return { ok: false, error: `Reservation not found: ${dto.reservationId}` };
      }
      if (reservation.getStatus().getKind() === 'COMMITTED') {
        // idempotent
        const { reservationToView } = await import('../dto/ReservationDTOs');
        return { ok: true, reservation: reservationToView(reservation) };
      }
      if (reservation.getStatus().getKind() !== 'HELD') {
        return {
          ok: false,
          error: `Cannot commit reservation in status ${reservation.getStatus().getKind()}`,
        };
      }

      const updatedLevels = new Map<string, InventoryLevel>();
      const updatedLotAggs = new Map<string, LotAggregate>();

      for (const line of reservation.getLines()) {
        // Lot consume: reservation line'ın lot allocation'larına göre
        const aggKey = `${line.getProductId()}@${line.getLocationId()}`;
        let lotAgg =
          updatedLotAggs.get(aggKey) ??
          (await this.lots.loadAggregate(line.getProductId(), line.getLocationId()));
        if (!lotAgg) {
          return {
            ok: false,
            error: `Lot aggregate missing for ${line.getProductId()}@${line.getLocationId()}`,
          };
        }
        let newAgg = lotAgg;
        for (const alloc of line.getLotAllocations()) {
          if (!alloc.lotId) continue;
          const lot = newAgg.getLots().find((l) => l.getId().getValue() === alloc.lotId);
          if (!lot) {
            return {
              ok: false,
              error: `Lot ${alloc.lotId} not found in aggregate`,
            };
          }
          newAgg = newAgg.applyDispatch({ lot, quantity: alloc.quantity });
        }
        updatedLotAggs.set(aggKey, newAgg);

        // InventoryLevel: hem onHand hem reserved azalır
        const levelKey = `${line.getProductId()}::${line.getLocationId()}::__null`;
        let level = updatedLevels.get(levelKey);
        if (!level) {
          level = await this.findOrCreateLevel(
            line.getProductId(),
            line.getLocationId(),
            null,
            ctx,
          );
        }
        level.applyReservationCommit(line.getReservedQuantity());
        updatedLevels.set(levelKey, level);
      }

      // Reservation commit
      const committed = reservation.commit();

      // Persistence
      await ctx.reservations.update(committed);
      for (const agg of updatedLotAggs.values()) {
        await this.lots.saveAggregate(agg);
      }
      for (const lvl of updatedLevels.values()) {
        await ctx.inventoryLevels.update(lvl);
      }

      // Events
      const events: import('../../interfaces/IDomainEvent').default[] = [];
      events.push(...committed.pullDomainEvents());
      for (const lvl of updatedLevels.values()) {
        events.push(...lvl.pullDomainEvents());
      }
      await ctx.outbox.enqueue(events);

      const { reservationToView } = await import('../dto/ReservationDTOs');
      return { ok: true, reservation: reservationToView(committed) };
    });
  }

  /**
   * Reservation'ı serbest bırak (order cancelled veya expired).
   * InventoryLevel: reserved -= qty (onHand değişmez).
   * LotAggregate'a dokunulmaz (lot hâlâ AVAILABLE durumda; sadece rezerve
   * bayrağı kalktı).
   */
  async releaseReservation(dto: ReleaseReservationDTO): Promise<ReservationResult> {
    return this.uow.execute(async (ctx) => {
      const reservation = await ctx.reservations.findById(ReservationId.of(dto.reservationId));
      if (!reservation) {
        return { ok: false, error: `Reservation not found: ${dto.reservationId}` };
      }
      if (reservation.getStatus().isTerminal()) {
        // idempotent — zaten terminal
        const { reservationToView } = await import('../dto/ReservationDTOs');
        return { ok: true, reservation: reservationToView(reservation) };
      }
      if (reservation.getStatus().getKind() === 'COMMITTED') {
        return {
          ok: false,
          error: 'Cannot release a COMMITTED reservation (already dispatched)',
        };
      }

      const updatedLevels = new Map<string, InventoryLevel>();
      for (const line of reservation.getLines()) {
        const levelKey = `${line.getProductId()}::${line.getLocationId()}::__null`;
        let level = updatedLevels.get(levelKey);
        if (!level) {
          level = await this.findOrCreateLevel(
            line.getProductId(),
            line.getLocationId(),
            null,
            ctx,
          );
        }
        level.applyRelease(line.getReservedQuantity());
        updatedLevels.set(levelKey, level);
      }

      const released = reservation.release(dto.reason ?? 'manual');

      // Persistence
      await ctx.reservations.update(released);
      for (const lvl of updatedLevels.values()) {
        await ctx.inventoryLevels.update(lvl);
      }

      // Events
      const events: import('../../interfaces/IDomainEvent').default[] = [];
      events.push(...released.pullDomainEvents());
      for (const lvl of updatedLevels.values()) {
        events.push(...lvl.pullDomainEvents());
      }
      await ctx.outbox.enqueue(events);

      const { reservationToView } = await import('../dto/ReservationDTOs');
      return { ok: true, reservation: reservationToView(released) };
    });
  }

  // ── Helpers ──

  private async findOrCreateLevel(
    productId: string,
    locationId: string,
    lotRef: LotRef | null,
    ctx: { inventoryLevels: InventoryLevelRepositoryPort },
  ): Promise<InventoryLevel> {
    const existing = await ctx.inventoryLevels.findByComposite(
      ProductId.create(productId),
      LocationRef.create(locationId),
      lotRef,
    );
    if (existing) return existing;
    const created = InventoryLevel.create({
      productId: ProductId.create(productId),
      location: LocationRef.create(locationId),
      lotRef,
    });
    await ctx.inventoryLevels.save(created);
    return created;
  }
}
