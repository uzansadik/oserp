/**
 * Port: ExchangeRateProvider
 *
 * Lookup FX rates as-of a given date. For MVP we read from a simple
 * in-process store; production would call a provider (TCMB, ECB, etc.).
 */
import { Currency } from '../../domain/value-objects/Currency';
import { ExchangeRate } from '../../domain/value-objects/ExchangeRate';

export interface ExchangeRateProvider {
  /**
   * Find a direct rate from -> to active at the given date.
   * Returns null if no such rate exists.
   */
  findDirectRate(from: Currency, to: Currency, at: Date): Promise<ExchangeRate | null>;

  /**
   * Save a new rate (manual entry / sync from provider).
   */
  save(rate: ExchangeRate): Promise<void>;

  /**
   * List all active rates at the given date.
   */
  listActiveAt(at: Date): Promise<ReadonlyArray<ExchangeRate>>;
}
