/**
 * Service: LotExpiryService
 *
 * Bulk-expire lots across all aggregates for a given product+location (or
 * all of them). Used by a daily cron / scheduler.
 *
 * Returns a summary: how many lots were expired, how much stock was written
 * off.
 */
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import { LotRepository } from '../ports/LotRepositoryPort';

export interface ExpiryRunSummary {
  aggregatesScanned: number;
  lotsExpired: number;
  stockWrittenOff: string; // decimal string
  at: Date;
}

export class LotExpiryService {
  constructor(private readonly repo: LotRepository) {}

  /**
   * Expire lots at the given date across all aggregates that contain any.
   */
  async runForDate(at: Date): Promise<ExpiryRunSummary> {
    const lots = await this.repo.search({});
    const byAggregate = new Map<string, ReturnType<typeof LotAggregate.load>>();
    for (const l of lots) {
      const key = `${l.getProductId()}@${l.getLocationId()}`;
      if (!byAggregate.has(key)) {
        const loaded = await this.repo.loadAggregate(l.getProductId(), l.getLocationId());
        if (loaded) byAggregate.set(key, loaded);
      }
    }
    let totalExpired = 0;
    let totalWrittenOff = 0;
    for (const agg of byAggregate.values()) {
      const { aggregate, expiredCount } = agg.expireAt(at);
      if (expiredCount > 0) {
        await this.repo.saveAggregate(aggregate);
        totalExpired += expiredCount;
        // Sum the quantities that were expired
        for (const lot of aggregate.getLots()) {
          if (lot.getStatus().getKind() === 'EXPIRED') {
            totalWrittenOff += Number(lot.getQuantityOnHand());
          }
        }
      }
    }
    return {
      aggregatesScanned: byAggregate.size,
      lotsExpired: totalExpired,
      stockWrittenOff: totalWrittenOff.toFixed(3),
      at,
    };
  }

  /**
   * Expire lots in a single product+location aggregate.
   */
  async runForAggregate(productId: string, locationId: string, at: Date): Promise<number> {
    const agg = await this.repo.loadAggregate(productId, locationId);
    if (!agg) return 0;
    const { aggregate, expiredCount } = agg.expireAt(at);
    if (expiredCount > 0) {
      await this.repo.saveAggregate(aggregate);
    }
    return expiredCount;
  }
}
