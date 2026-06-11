/**
 * LotAggregate — per productId+locationId group of lots
 *
 * Holds all lots for one product at one location. The aggregate's job:
 *   - Provide FEFO-ordered dispatch: given a quantity, return the lot list
 *     (with amounts) needed to satisfy it
 *   - Track total available stock (sum of AVAILABLE lot quantities)
 *   - Expire lots in bulk
 *
 * Identity: productId + locationId (composite). One aggregate per SKU-per-bin.
 * Lots inside the aggregate are immutable snapshots; the aggregate itself
 * just owns the collection and offers FEFO algorithms.
 */
import { ExpiryDate } from '../value-objects/ExpiryDate';
import { Lot } from '../entities/Lot';
import { LotStatus } from '../value-objects/LotStatus';
import { SerialNumber } from '../value-objects/SerialNumber';
import { AggregateRoot } from '../entities/AggregateRoot';
import {
  LotCreatedEvent,
  LotConsumedEvent,
  LotExpiredEvent,
  SerialNumberAllocatedEvent,
} from '../events/LotEvents';

export interface LotAggregateProps {
  productId: string;
  locationId: string;
  lots: ReadonlyArray<Lot>;
}

export interface DispatchAllocation {
  lot: Lot;
  quantity: string;
}

export interface DispatchResult {
  allocations: ReadonlyArray<DispatchAllocation>;
  totalAllocated: string;
  remaining: string; // amount still needed (0 if fully satisfied)
}

export class LotAggregate extends AggregateRoot {
  private constructor(private readonly props: LotAggregateProps) {
    super();
    Object.freeze(this.props.lots);
    // No Object.freeze(this) — AggregateRoot mutates domainEvents.
  }

  static load(props: LotAggregateProps): LotAggregate {
    return new LotAggregate(props);
  }

  static empty(productId: string, locationId: string): LotAggregate {
    return new LotAggregate({ productId, locationId, lots: [] });
  }

  getProductId(): string {
    return this.props.productId;
  }
  getLocationId(): string {
    return this.props.locationId;
  }
  getLots(): ReadonlyArray<Lot> {
    return this.props.lots;
  }

  /**
   * Return only AVAILABLE + non-expired lots.
   */
  getDispatchableLots(at: Date): ReadonlyArray<Lot> {
    return this.props.lots.filter((l) => l.isDispatchable() && !l.isExpired(at));
  }

  getTotalAvailable(at: Date): string {
    return this.getDispatchableLots(at)
      .reduce((sum, l) => sum + Number(l.getQuantityOnHand()), 0)
      .toFixed(3);
  }

  /**
   * FEFO dispatch: given a desired quantity, return the list of (lot, qty)
   * pairs that sum to at most the requested amount, pulled from lots with
   * earliest expiry first.
   *
   * Returns a DispatchResult with allocations + remaining (positive if not
   * enough stock).
   */
  dispatch(requestedQty: string, at: Date = new Date()): DispatchResult {
    const requested = Number(requestedQty);
    if (requested <= 0) {
      throw new Error(`Dispatch quantity must be positive: ${requestedQty}`);
    }
    const available = [...this.getDispatchableLots(at)].sort((a, b) => a.compareFefo(b));
    const allocations: DispatchAllocation[] = [];
    let remaining = requested;
    for (const lot of available) {
      if (remaining <= 0) break;
      const lotQty = Number(lot.getQuantityOnHand());
      if (lotQty <= 0) continue;
      const take = Math.min(remaining, lotQty);
      allocations.push({ lot, quantity: take.toFixed(3) });
      remaining -= take;
    }
    const totalAllocated = requested - remaining;
    return {
      allocations,
      totalAllocated: totalAllocated.toFixed(3),
      remaining: remaining.toFixed(3),
    };
  }

  /**
   * Add a new lot to the aggregate (e.g. on receive).
   * Returns the new aggregate snapshot (immutability).
   */
  addLot(lot: Lot): LotAggregate {
    if (lot.getProductId() !== this.props.productId) {
      throw new Error(`Lot productId ${lot.getProductId()} != aggregate ${this.props.productId}`);
    }
    if (lot.getLocationId() !== this.props.locationId) {
      throw new Error(`Lot locationId ${lot.getLocationId()} != aggregate ${this.props.locationId}`);
    }
    const newLots = [...this.props.lots, lot];
    const next = new LotAggregate({
      productId: this.props.productId,
      locationId: this.props.locationId,
      lots: newLots,
    });
    next.addDomainEvent(
      new LotCreatedEvent({
        lotId: lot.getId().getValue(),
        productId: lot.getProductId(),
        locationId: lot.getLocationId(),
        quantity: lot.getQuantityOnHand(),
        expiryDate: lot.getExpiryDate().toJSON(),
        receivedAt: lot.getReceivedAt(),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  /**
   * Apply a dispatch: produce a new aggregate with reduced lot quantities.
   * Lot snapshots inside are replaced with consumed versions.
   */
  applyDispatch(allocation: DispatchAllocation): LotAggregate {
    const consumedLot = allocation.lot.consume(allocation.quantity);
    const newLots = this.props.lots.map((l) => (l.getId().equals(consumedLot.getId()) ? consumedLot : l));
    const next = new LotAggregate({
      productId: this.props.productId,
      locationId: this.props.locationId,
      lots: newLots,
    });
    next.addDomainEvent(
      new LotConsumedEvent({
        lotId: consumedLot.getId().getValue(),
        productId: this.props.productId,
        locationId: this.props.locationId,
        quantity: allocation.quantity,
        remainingQuantity: consumedLot.getQuantityOnHand(),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  /**
   * Mark expired lots at the given date. Returns the new aggregate + count.
   * Already-EXPIRED lots are skipped (idempotent).
   */
  expireAt(at: Date): { aggregate: LotAggregate; expiredCount: number } {
    let expiredCount = 0;
    const newLots: Lot[] = [];
    for (const lot of this.props.lots) {
      if (
        lot.isExpired(at) &&
        lot.getStatus().getKind() !== 'EXPIRED' &&
        lot.getStatus().canTransitionTo(LotStatus.expired())
      ) {
        newLots.push(lot.withStatus(LotStatus.expired()));
        expiredCount += 1;
      } else {
        newLots.push(lot);
      }
    }
    const next = new LotAggregate({
      productId: this.props.productId,
      locationId: this.props.locationId,
      lots: newLots,
    });
    if (expiredCount > 0) {
      next.addDomainEvent(
        new LotExpiredEvent({
          productId: this.props.productId,
          locationId: this.props.locationId,
          count: expiredCount,
          atDate: at,
          occurredAt: new Date(),
        }),
      );
    }
    return { aggregate: next, expiredCount };
  }

  /**
   * Allocate serial numbers to a lot (e.g. when receiving serialized goods).
   */
  allocateSerialNumbers(lotIdValue: string, serialValues: ReadonlyArray<string>): LotAggregate {
    const lot = this.props.lots.find((l) => l.getId().getValue() === lotIdValue);
    if (!lot) {
      throw new Error(`Lot not found: ${lotIdValue}`);
    }
    const serials = serialValues.map((v) => SerialNumber.of(v));
    const baseProps = lot as unknown as {
      id: Lot['getId'] extends () => infer T ? T : never;
      productId: string;
      locationId: string;
      quantityOnHand: string;
      uom: string;
      status: LotStatus;
      expiryDate: ExpiryDate;
      mfgDate: Date | null;
      receivedAt: Date;
      supplierLotCode: string | null;
      version: number;
      notes: string | null;
    };
    const newLot = Lot.create({
      id: baseProps.id,
      productId: baseProps.productId,
      locationId: baseProps.locationId,
      quantityOnHand: baseProps.quantityOnHand,
      uom: baseProps.uom,
      status: baseProps.status,
      expiryDate: baseProps.expiryDate,
      mfgDate: baseProps.mfgDate,
      receivedAt: baseProps.receivedAt,
      supplierLotCode: baseProps.supplierLotCode,
      serialNumbers: serials,
      notes: baseProps.notes,
      version: baseProps.version + 1,
    });
    const newLots = this.props.lots.map((l) => (l.getId().equals(lot.getId()) ? newLot : l));
    const next = new LotAggregate({
      productId: this.props.productId,
      locationId: this.props.locationId,
      lots: newLots,
    });
    next.addDomainEvent(
      new SerialNumberAllocatedEvent({
        lotId: lotIdValue,
        productId: this.props.productId,
        locationId: this.props.locationId,
        count: serials.length,
        occurredAt: new Date(),
      }),
    );
    return next;
  }
}
