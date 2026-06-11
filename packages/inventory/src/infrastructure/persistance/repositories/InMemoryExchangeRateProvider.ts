/**
 * In-memory ExchangeRateProvider. For tests / dev.
 */
import type { ExchangeRate } from '@oserp-community/inventory/domain/value-objects/ExchangeRate';
import type { ExchangeRateProvider } from '@oserp-community/inventory/application/ports/ExchangeRateProviderPort';
import type { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';

export class InMemoryExchangeRateProvider implements ExchangeRateProvider {
  private readonly rates: ExchangeRate[] = [];

  async save(rate: ExchangeRate): Promise<void> {
    // Replace any overlapping rate for same pair + effectiveFrom
    this.rates.push(rate);
  }

  async findDirectRate(from: Currency, to: Currency, at: Date): Promise<ExchangeRate | null> {
    const candidates = this.rates
      .filter(
        (r) => r.getFrom().equals(from) && r.getTo().equals(to) && r.isActiveAt(at),
      )
      .sort((a, b) => b.getEffectiveFrom().getTime() - a.getEffectiveFrom().getTime());
    return candidates[0] ?? null;
  }

  async listActiveAt(at: Date): Promise<ReadonlyArray<ExchangeRate>> {
    return this.rates.filter((r) => r.isActiveAt(at));
  }
}
