/**
 * ExchangeRate Value Object
 *
 * Represents a conversion rate from one currency to another at a given point
 * in time. Convention: `Rate(TRY, USD, 0.028)` means 1 TRY = 0.028 USD.
 *
 * Includes effectiveFrom/effectiveTo validity window for time-bounded rates
 * (FX rates go stale; you don't want a 2023 rate applied to a 2026 invoice).
 *
 * For MVP we use a simple direct rate table (TRY->USD, USD->EUR). Cross rates
 * (TRY->EUR) are derived by PricingCalculator using TRY->USD * USD->EUR.
 */
import { Currency } from './Currency';

export class ExchangeRate {
  private constructor(
    private readonly from: Currency,
    private readonly to: Currency,
    private readonly rate: number,
    private readonly effectiveFrom: Date,
    private readonly effectiveTo: Date | null,
    private readonly source: string,
  ) {
    Object.freeze(this);
  }

  static create(opts: {
    from: Currency;
    to: Currency;
    rate: number;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    source?: string;
  }): ExchangeRate {
    if (opts.rate <= 0) {
      throw new Error(`Exchange rate must be positive: ${opts.rate}`);
    }
    if (opts.from.equals(opts.to)) {
      throw new Error(`Cannot create rate for identical currencies: ${opts.from}`);
    }
    if (opts.effectiveTo && opts.effectiveTo <= opts.effectiveFrom) {
      throw new Error('effectiveTo must be after effectiveFrom');
    }
    return new ExchangeRate(
      opts.from,
      opts.to,
      opts.rate,
      opts.effectiveFrom,
      opts.effectiveTo ?? null,
      opts.source ?? 'MANUAL',
    );
  }

  static identity(of: Currency, asOf: Date = new Date()): ExchangeRate {
    return new ExchangeRate(of, of, 1, asOf, null, 'IDENTITY');
  }

  getFrom(): Currency {
    return this.from;
  }
  getTo(): Currency {
    return this.to;
  }
  getRate(): number {
    return this.rate;
  }
  getEffectiveFrom(): Date {
    return this.effectiveFrom;
  }
  getEffectiveTo(): Date | null {
    return this.effectiveTo;
  }
  getSource(): string {
    return this.source;
  }

  isActiveAt(at: Date): boolean {
    if (at < this.effectiveFrom) return false;
    if (this.effectiveTo && at >= this.effectiveTo) return false;
    return true;
  }

  /**
   * Convert an amount from this.from to this.to at the given rate.
   * Rounds to 4 decimals (FX precision; downstream Currency rounds to minor).
   */
  convert(amount: number): number {
    return Math.round(amount * this.rate * 10000) / 10000;
  }

  equals(other: ExchangeRate): boolean {
    if (!(other instanceof ExchangeRate)) return false;
    return (
      this.from.equals(other.from) &&
      this.to.equals(other.to) &&
      this.rate === other.rate &&
      this.effectiveFrom.getTime() === other.effectiveFrom.getTime()
    );
  }
}
