/**
 * Port: LotRepository
 *
 * Persists LotAggregate instances (one per productId+locationId).
 * Returns the aggregate (not just rows) so domain invariants stay in the
 * aggregate layer.
 */
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import { Lot } from '../../domain/entities/Lot';
import { LotId } from '../../domain/value-objects/LotId';

export interface LotSearchCriteria {
  productId?: string | undefined;
  locationId?: string | undefined;
  status?: 'AVAILABLE' | 'QUARANTINED' | 'EXPIRED' | 'DEPLETED' | undefined;
  expiresBefore?: Date | undefined;
  hasExpiry?: boolean | undefined;
  limit?: number | undefined;
}

export interface LotRepository {
  /** Load the full aggregate for one product+location. */
  loadAggregate(productId: string, locationId: string): Promise<LotAggregate | null>;

  /** Save the entire aggregate (replace all lots). */
  saveAggregate(agg: LotAggregate): Promise<void>;

  /** Find individual lots (across aggregates). */
  findById(lotId: LotId): Promise<Lot | null>;

  search(criteria: LotSearchCriteria): Promise<ReadonlyArray<Lot>>;
}
