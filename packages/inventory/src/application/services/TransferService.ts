/**
 * Service: TransferService
 *
 * İki lokasyon arası stok transferi (2-step).
 *
 * 1) dispatch():
 *    - FEFO ile kaynak lokasyondan lot seç
 *    - source.onHand -= qty, source.inTransit += qty
 *    - TransferOrder.dispatch() event üretir
 *    - Lot dispatch (lot.quantityOnHand -= qty)
 *
 * 2) receive():
 *    - target.onHand += receivedQty
 *    - source.inTransit -= receivedQty
 *    - Variance = dispatched - received (kayıp/hasar)
 *    - Eğer variance varsa: ayrı scrap kaydı (MVP'de sadece event üretir)
 *
 * 3) close():
 *    - TransferOrder'ı CLOSED yap
 *
 * Tüm işlemler tek bir UoW transaction'ında atomic.
 */
import { TransferOrder } from '../../domain/aggregates/TransferOrder';
import { TransferLine, type TransferLineProps } from '../../domain/entities/TransferLine';
import { TransferLineRef, TransferId } from '../../domain/value-objects/TransferId';
import { InventoryLevel } from '../../domain/entities/InventoryLevel';
import { ProductId } from '../../domain/value-objects/ProductId';
import { LocationRef } from '../../domain/value-objects/LocationRef';
import { LotRef } from '../../domain/value-objects/LotRef';
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import type { LotRepository } from '../ports/LotRepositoryPort';
import type { LotDispatchStrategy } from '../ports/LotDispatchStrategyPort';
import type { InventoryLevelRepositoryPort } from '../ports/InventoryLevelRepositoryPort';
import type { TransferRepository } from '../ports/TransferRepositoryPort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';
import type { ClockPort } from '../ports/ClockPort';
import type {
  CreateTransferDTO,
  DispatchTransferDTO,
  ReceiveTransferDTO,
  CancelTransferDTO,
} from '../dto/TransferDTOs';
import type { TransferResult } from '../commands/TransferCommands';
import { transferToView } from '../dto/TransferDTOs';

export class TransferService {
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly transfers: TransferRepository,
    private readonly lots: LotRepository,
    private readonly levels: InventoryLevelRepositoryPort,
    private readonly dispatch: LotDispatchStrategy,
    private readonly clock: ClockPort,
  ) {}

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Yeni transfer oluştur (DRAFT). Henüz stok hareketi yok.
   */
  async createTransfer(dto: CreateTransferDTO): Promise<TransferResult> {
    if (!dto.lines || dto.lines.length === 0) {
      return { ok: false, error: 'Transfer must have at least one line' };
    }
    if (dto.sourceLocationId === dto.destinationLocationId) {
      return { ok: false, error: 'Source and destination must differ' };
    }

    return this.uow.execute(async (ctx) => {
      const transferNumber = dto.transferNumber ?? (await ctx.transfers.nextTransferNumber());
      const lines: TransferLine[] = dto.lines.map((l) =>
        TransferLine.create({
          ref: TransferLineRef.of(l.productId, l.lotId ?? null),
          requestedQuantity: l.requestedQuantity,
          uom: l.uom,
          selectedLotId: l.lotId ?? null,
          dispatchedQuantity: '0',
          receivedQuantity: '0',
          notes: null,
        }),
      );
      const transfer = TransferOrder.create({
        id: dto.id,
        transferNumber,
        sourceLocation: LocationRef.create(dto.sourceLocationId),
        destinationLocation: LocationRef.create(dto.destinationLocationId),
        lines,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
      });
      await ctx.transfers.save(transfer);
      const events: import('../../interfaces/IDomainEvent').default[] = transfer.pullDomainEvents();
      await ctx.outbox.enqueue(events);
      return { ok: true, transfer: transferToView(transfer) };
    });
  }

  /**
   * Dispatch: DRAFT → DISPATCHED.
   * FEFO ile lot seç, source.onHand -= qty, source.inTransit += qty.
   */
  async dispatchTransfer(dto: DispatchTransferDTO): Promise<TransferResult> {
    return this.uow.execute(async (ctx) => {
      const transfer = await ctx.transfers.findById(TransferId.of(dto.transferId));
      if (!transfer) {
        return { ok: false, error: `Transfer not found: ${dto.transferId}` };
      }
      if (transfer.getStatus().getKind() !== 'DRAFT') {
        return {
          ok: false,
          error: `Cannot dispatch transfer in status ${transfer.getStatus().getKind()}`,
        };
      }

      const lineDispatches: { productId: string; lotId: string; dispatchedQty: string }[] = [];
      const unallocated: { productId: string; missing: string }[] = [];
      const updatedLevels = new Map<string, InventoryLevel>();
      const updatedLotAggs = new Map<string, LotAggregate>();

      for (const line of transfer.getLines()) {
        const requested = line.getRequestedQuantity();
        // Kullanıcı override etti mi?
        const override = dto.lineDispatches?.find(
          (ld) => ld.productId === line.getProductId(),
        );
        const targetQty = override?.dispatchedQuantity ?? requested;

        // Lot aggregate'ı yükle
        const aggKey = `${line.getProductId()}@${transfer.getSourceLocation().getLocationId()}`;
        const lotAgg =
          updatedLotAggs.get(aggKey) ??
          (await this.lots.loadAggregate(
            line.getProductId(),
            transfer.getSourceLocation().getLocationId(),
          ));
        if (!lotAgg) {
          unallocated.push({ productId: line.getProductId(), missing: targetQty });
          continue;
        }
        const dispatchResult = lotAgg.dispatch(targetQty, this.clock.now());
        if (Number(dispatchResult.remaining) > 0) {
          unallocated.push({
            productId: line.getProductId(),
            missing: dispatchResult.remaining,
          });
          continue;
        }
        let newAgg = lotAgg;
        for (const alloc of dispatchResult.allocations) {
          newAgg = newAgg.applyDispatch(alloc);
        }
        updatedLotAggs.set(aggKey, newAgg);

        // Source InventoryLevel: onHand -= qty, inTransit += qty
        const levelKey = `${line.getProductId()}::${transfer.getSourceLocation().getLocationId()}::__null`;
        let level = updatedLevels.get(levelKey);
        if (!level) {
          level = await this.findOrCreateLevel(
            line.getProductId(),
            transfer.getSourceLocation().getLocationId(),
            null,
            ctx,
          );
        }
        level.applyTransferOut(targetQty);
        updatedLevels.set(levelKey, level);

        // Line dispatch bilgisi
        const primaryLot = dispatchResult.allocations[0]?.lot.getId().getValue() ?? 'unknown';
        lineDispatches.push({
          productId: line.getProductId(),
          lotId: primaryLot,
          dispatchedQty: targetQty,
        });
      }

      if (unallocated.length > 0) {
        return {
          ok: false,
          error: 'Insufficient stock at source location for one or more products',
          unallocated,
        };
      }

      const dispatched = transfer.dispatch(lineDispatches);

      // Persistence
      await ctx.transfers.update(dispatched);
      for (const agg of updatedLotAggs.values()) {
        await this.lots.saveAggregate(agg);
      }
      for (const lvl of updatedLevels.values()) {
        await ctx.inventoryLevels.update(lvl);
      }

      // Events
      const events: import('../../interfaces/IDomainEvent').default[] = [];
      events.push(...dispatched.pullDomainEvents());
      for (const lvl of updatedLevels.values()) {
        events.push(...lvl.pullDomainEvents());
      }
      await ctx.outbox.enqueue(events);

      return { ok: true, transfer: transferToView(dispatched) };
    });
  }

  /**
   * InTransit: dispatch → in_transit. Sadece status update, stok hareketi yok.
   */
  async markInTransit(transferId: string): Promise<TransferResult> {
    return this.uow.execute(async (ctx) => {
      const transfer = await ctx.transfers.findById(TransferId.of(transferId));
      if (!transfer) return { ok: false, error: `Transfer not found: ${transferId}` };
      if (transfer.getStatus().getKind() !== 'DISPATCHED') {
        return { ok: true, transfer: transferToView(transfer) }; // idempotent
      }
      const inTransit = transfer.markInTransit();
      await ctx.transfers.update(inTransit);
      const events: import('../../interfaces/IDomainEvent').default[] = inTransit.pullDomainEvents();
      await ctx.outbox.enqueue(events);
      return { ok: true, transfer: transferToView(inTransit) };
    });
  }

  /**
   * Receive: hedef lokasyon malı kabul etti.
   * target.onHand += receivedQty
   * source.inTransit -= receivedQty (veya variance varsa fark)
   */
  async receiveTransfer(dto: ReceiveTransferDTO): Promise<TransferResult> {
    return this.uow.execute(async (ctx) => {
      const transfer = await ctx.transfers.findById(TransferId.of(dto.transferId));
      if (!transfer) {
        return { ok: false, error: `Transfer not found: ${dto.transferId}` };
      }
      if (
        transfer.getStatus().getKind() !== 'DISPATCHED' &&
        transfer.getStatus().getKind() !== 'IN_TRANSIT'
      ) {
        return {
          ok: false,
          error: `Cannot receive transfer in status ${transfer.getStatus().getKind()}`,
        };
      }

      // Her line için doğrula: received ≤ dispatched
      for (const recv of dto.lineReceives) {
        const line = transfer
          .getLines()
          .find((l) => l.getProductId() === recv.productId);
        if (!line) {
          return {
            ok: false,
            error: `Product ${recv.productId} not in transfer`,
          };
        }
        if (Number(recv.receivedQuantity) > Number(line.getDispatchedQuantity())) {
          return {
            ok: false,
            error: `Received ${recv.receivedQuantity} > dispatched ${line.getDispatchedQuantity()} for ${recv.productId}`,
          };
        }
      }

      const received = transfer.receive(dto.lineReceives);

      // Stok hareketleri
      const updatedLevels = new Map<string, InventoryLevel>();
      for (const line of received.getLines()) {
        const receivedQty = line.getReceivedQuantity();
        if (Number(receivedQty) === 0) continue; // bu satır hiç gelmedi

        // Target InventoryLevel: onHand += receivedQty
        const targetKey = `${line.getProductId()}::${transfer.getDestinationLocation().getLocationId()}::__null`;
        let targetLevel = updatedLevels.get(targetKey);
        if (!targetLevel) {
          targetLevel = await this.findOrCreateLevel(
            line.getProductId(),
            transfer.getDestinationLocation().getLocationId(),
            null,
            ctx,
          );
        }
        targetLevel.applyReceipt(receivedQty); // onHand += qty (varış lokasyonunda)
        updatedLevels.set(targetKey, targetLevel);

        // Source InventoryLevel: inTransit -= receivedQty (fiziksel stok ayrıldı)
        const sourceKey = `${line.getProductId()}::${transfer.getSourceLocation().getLocationId()}::__null`;
        let sourceLevel = updatedLevels.get(sourceKey);
        if (!sourceLevel) {
          sourceLevel = await this.findOrCreateLevel(
            line.getProductId(),
            transfer.getSourceLocation().getLocationId(),
            null,
            ctx,
          );
        }
        sourceLevel.applyTransitClear(receivedQty); // sadece inTransit -= qty (onHand değişmez)
        updatedLevels.set(sourceKey, sourceLevel);

        // Variance: dispatched - received → eğer > 0 ise source.onHand -= variance
        // (kayıp/hasar — gerçek dünyada scrap kaydı yapılır; burada
        // InventoryLevel.onHand'den düşüyoruz çünkü stok fiziksel olarak
        // yok). NOT: Bu MVP'de kabul edilebilir bir yaklaşım; production'da
        // ayrı ScrapReason ile kayıt altına alınabilir.
        const variance = Number(line.getDispatchedQuantity()) - Number(receivedQty);
        if (variance > 0) {
          sourceLevel.applyScrap(variance.toString());
          updatedLevels.set(sourceKey, sourceLevel);
        }
      }

      // Persistence
      await ctx.transfers.update(received);
      for (const lvl of updatedLevels.values()) {
        await ctx.inventoryLevels.update(lvl);
      }

      // Events
      const events: import('../../interfaces/IDomainEvent').default[] = [];
      events.push(...received.pullDomainEvents());
      for (const lvl of updatedLevels.values()) {
        events.push(...lvl.pullDomainEvents());
      }
      await ctx.outbox.enqueue(events);

      return { ok: true, transfer: transferToView(received) };
    });
  }

  /**
   * Close: tüm satırlar reconcile edildi, faturalandırılabilir.
   */
  async closeTransfer(transferId: string): Promise<TransferResult> {
    return this.uow.execute(async (ctx) => {
      const transfer = await ctx.transfers.findById(TransferId.of(transferId));
      if (!transfer) {
        return { ok: false, error: `Transfer not found: ${transferId}` };
      }
      if (transfer.getStatus().getKind() !== 'RECEIVED') {
        return {
          ok: false,
          error: `Cannot close transfer in status ${transfer.getStatus().getKind()}`,
        };
      }
      const closed = transfer.close();
      await ctx.transfers.update(closed);
      const events: import('../../interfaces/IDomainEvent').default[] = closed.pullDomainEvents();
      await ctx.outbox.enqueue(events);
      return { ok: true, transfer: transferToView(closed) };
    });
  }

  /**
   * Cancel: sadece DRAFT'ta.
   */
  async cancelTransfer(dto: CancelTransferDTO): Promise<TransferResult> {
    return this.uow.execute(async (ctx) => {
      const transfer = await ctx.transfers.findById(TransferId.of(dto.transferId));
      if (!transfer) {
        return { ok: false, error: `Transfer not found: ${dto.transferId}` };
      }
      if (transfer.getStatus().getKind() !== 'DRAFT') {
        return {
          ok: false,
          error: `Cannot cancel transfer in status ${transfer.getStatus().getKind()} (only DRAFT)`,
        };
      }
      const cancelled = transfer.cancel(dto.reason ?? null);
      await ctx.transfers.update(cancelled);
      const events: import('../../interfaces/IDomainEvent').default[] = cancelled.pullDomainEvents();
      await ctx.outbox.enqueue(events);
      return { ok: true, transfer: transferToView(cancelled) };
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
