/**
 * In-memory LotRepository. For tests / dev.
 */
import { Lot } from '@oserp-community/inventory/domain/entities/Lot';
import { LotAggregate } from '@oserp-community/inventory/domain/aggregates/LotAggregate';
import { LotId } from '@oserp-community/inventory/domain/value-objects/LotId';
import type { LotRepository, LotSearchCriteria } from '@oserp-community/inventory/application/ports/LotRepositoryPort';

export class InMemoryLotRepository implements LotRepository {
  /** Map<productId|locationId, LotAggregate> */
  private readonly aggregates = new Map<string, LotAggregate>();

  private key(productId: string, locationId: string): string {
    return `${productId}|${locationId}`;
  }

  async loadAggregate(productId: string, locationId: string): Promise<LotAggregate | null> {
    return this.aggregates.get(this.key(productId, locationId)) ?? null;
  }

  async saveAggregate(agg: LotAggregate): Promise<void> {
    this.aggregates.set(this.key(agg.getProductId(), agg.getLocationId()), agg);
  }

  async findById(lotId: LotId): Promise<Lot | null> {
    for (const agg of this.aggregates.values()) {
      const found = agg.getLots().find((l) => l.getId().equals(lotId));
      if (found) return found;
    }
    return null;
  }

  async search(criteria: LotSearchCriteria): Promise<ReadonlyArray<Lot>> {
    const out: Lot[] = [];
    for (const agg of this.aggregates.values()) {
      if (criteria.productId && agg.getProductId() !== criteria.productId) continue;
      if (criteria.locationId && agg.getLocationId() !== criteria.locationId) continue;
      for (const lot of agg.getLots()) {
        if (criteria.status && lot.getStatus().getKind() !== criteria.status) continue;
        if (criteria.hasExpiry === true && !lot.getExpiryDate().hasExpiry()) continue;
        if (criteria.hasExpiry === false && lot.getExpiryDate().hasExpiry()) continue;
        if (criteria.expiresBefore && lot.getExpiryDate().getDate()) {
          if (lot.getExpiryDate().getDate()! >= criteria.expiresBefore) continue;
        }
        out.push(lot);
      }
    }
    const limit = criteria.limit ?? out.length;
    return out.slice(0, limit);
  }

  // Test helper
  __reset(): void {
    this.aggregates.clear();
  }
}
