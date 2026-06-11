/**
 * Handlers: Lot use cases
 *
 *   - CreateLotHandler: add a new lot to an aggregate (or create aggregate)
 *   - DispatchLotsHandler: FEFO allocate and reduce lots
 *   - ExpireLotsHandler: bulk-expire lots at a date
 *   - QuarantineLotHandler: mark a lot QUARANTINED
 *   - AllocateSerialsHandler: attach serials to a lot
 *   - GetLotAggregateHandler: load aggregate
 *   - ListLotsHandler: search across aggregates
 */
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import { LotId } from '../../domain/value-objects/LotId';
import { LotStatus } from '../../domain/value-objects/LotStatus';
import { LotRepository } from '../ports/LotRepositoryPort';
import { LotDispatchStrategy } from '../ports/LotDispatchStrategyPort';
import {
  AllocateSerialsDTO,
  CreateLotDTO,
  DispatchLotDTO,
  ExpireLotsDTO,
  QuarantineLotDTO,
  makeLot,
  DispatchResultView,
  DispatchAllocationView,
} from '../dto/LotDTOs';

export class CreateLotHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(dto: CreateLotDTO): Promise<string> {
    const lot = makeLot({
      id: dto.id ?? `lot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: dto.productId,
      locationId: dto.locationId,
      quantity: dto.quantity,
      uom: dto.uom,
      expiryDate: dto.expiryDate ?? null,
      mfgDate: dto.mfgDate ?? null,
      supplierLotCode: dto.supplierLotCode ?? null,
      serialNumbers: dto.serialNumbers ?? [],
      notes: dto.notes ?? null,
    });
    const existing = await this.repo.loadAggregate(dto.productId, dto.locationId);
    const agg = existing ?? LotAggregate.empty(dto.productId, dto.locationId);
    const next = agg.addLot(lot);
    await this.repo.saveAggregate(next);
    void next.pullDomainEvents();
    return lot.getId().getValue();
  }
}

export class DispatchLotsHandler {
  constructor(
    private readonly repo: LotRepository,
    private readonly strategy: LotDispatchStrategy,
  ) {}
  async execute(dto: DispatchLotDTO): Promise<DispatchResultView> {
    const agg = await this.repo.loadAggregate(dto.productId, dto.locationId);
    if (!agg) {
      return { allocations: [], totalAllocated: '0.000', remaining: dto.requestedQuantity };
    }
    const at = dto.asOf ? new Date(dto.asOf) : new Date();
    // Use strategy to sort lots
    const orderedLots = this.strategy.order(agg.getLots(), at);
    // Re-run dispatch using the ordered lots
    let remaining = Number(dto.requestedQuantity);
    const allocations: DispatchAllocationView[] = [];
    let workingAgg = agg;
    for (const lot of orderedLots) {
      if (remaining <= 0) break;
      const lotQty = Number(lot.getQuantityOnHand());
      if (lotQty <= 0) continue;
      const take = Math.min(remaining, lotQty);
      workingAgg = workingAgg.applyDispatch({ lot, quantity: take.toFixed(3) });
      allocations.push({ lotId: lot.getId().getValue(), quantity: take.toFixed(3) });
      remaining -= take;
    }
    if (allocations.length > 0) {
      await this.repo.saveAggregate(workingAgg);
      void workingAgg.pullDomainEvents();
    }
    const totalAllocated = Number(dto.requestedQuantity) - remaining;
    return {
      allocations,
      totalAllocated: totalAllocated.toFixed(3),
      remaining: remaining.toFixed(3),
    };
  }
}

export class ExpireLotsHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(dto: ExpireLotsDTO): Promise<{ expiredCount: number }> {
    const at = new Date(dto.at);
    if (dto.productId && dto.locationId) {
      const agg = await this.repo.loadAggregate(dto.productId, dto.locationId);
      if (!agg) return { expiredCount: 0 };
      const { aggregate, expiredCount } = agg.expireAt(at);
      if (expiredCount > 0) {
        await this.repo.saveAggregate(aggregate);
        void aggregate.pullDomainEvents();
      }
      return { expiredCount };
    }
    // Bulk across all aggregates
    const lots = await this.repo.search({});
    const seen = new Set<string>();
    let totalExpired = 0;
    for (const l of lots) {
      const key = `${l.getProductId()}@${l.getLocationId()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const agg = await this.repo.loadAggregate(l.getProductId(), l.getLocationId());
      if (!agg) continue;
      const { aggregate, expiredCount } = agg.expireAt(at);
      if (expiredCount > 0) {
        await this.repo.saveAggregate(aggregate);
        void aggregate.pullDomainEvents();
        totalExpired += expiredCount;
      }
    }
    return { expiredCount: totalExpired };
  }
}

export class QuarantineLotHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(dto: QuarantineLotDTO): Promise<void> {
    const lot = await this.repo.findById(LotId.of(dto.lotId));
    if (!lot) throw new Error(`Lot not found: ${dto.lotId}`);
    const agg = await this.repo.loadAggregate(lot.getProductId(), lot.getLocationId());
    if (!agg) throw new Error('Aggregate not found');
    // The lot reference inside the aggregate is what we mutate
    const targetLot = agg.getLots().find((l) => l.getId().equals(lot.getId()));
    if (!targetLot) throw new Error('Lot not in aggregate');
    const updated = targetLot.withStatus(LotStatus.quarantined());
    const newLots = agg.getLots().map((l) => (l.getId().equals(lot.getId()) ? updated : l));
    const newAgg = LotAggregate.load({
      productId: agg.getProductId(),
      locationId: agg.getLocationId(),
      lots: newLots,
    });
    await this.repo.saveAggregate(newAgg);
    void newAgg.pullDomainEvents();
  }
}

export class AllocateSerialsHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(dto: AllocateSerialsDTO): Promise<void> {
    const lot = await this.repo.findById(LotId.of(dto.lotId));
    if (!lot) throw new Error(`Lot not found: ${dto.lotId}`);
    const agg = await this.repo.loadAggregate(lot.getProductId(), lot.getLocationId());
    if (!agg) throw new Error('Aggregate not found');
    const next = agg.allocateSerialNumbers(dto.lotId, dto.serialNumbers);
    await this.repo.saveAggregate(next);
    void next.pullDomainEvents();
  }
}

export class GetLotAggregateHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(productId: string, locationId: string): Promise<LotAggregate | null> {
    return this.repo.loadAggregate(productId, locationId);
  }
}

export class ListLotsHandler {
  constructor(private readonly repo: LotRepository) {}
  async execute(productId?: string, locationId?: string) {
    return this.repo.search({ productId, locationId });
  }
}
