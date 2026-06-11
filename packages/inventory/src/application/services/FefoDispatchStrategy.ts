/**
 * Service: FefoDispatchStrategy
 *
 * First-Expired-First-Out ordering. Lots without expiry sort last
 * (ExpiryDate.sortKey returns far-future for none()).
 *
 * Ties broken by receivedAt (older first).
 */
import { Lot } from '../../domain/entities/Lot';
import { LotDispatchStrategy } from '../ports/LotDispatchStrategyPort';

export class FefoDispatchStrategy implements LotDispatchStrategy {
  readonly name = 'FEFO';

  order(lots: ReadonlyArray<Lot>, at: Date): ReadonlyArray<Lot> {
    return [...lots]
      .filter((l) => l.isDispatchable() && !l.isExpired(at))
      .sort((a, b) => a.compareFefo(b));
  }
}
