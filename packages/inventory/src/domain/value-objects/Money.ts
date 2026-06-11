/**
 * Money Value Object
 *
 * Decimal-safe money representation: (amount: number, currency: Currency).
 * All arithmetic via integer minor units to avoid float drift (e.g. 0.1+0.2
 * problem). For display, use fromMinorUnits() to get the decimal value.
 *
 * Examples:
 *   Money.of(99.99, "USD") -> 9999 cents
 *   Money.zero("USD") -> 0 cents
 *   a.add(b) -> new Money with combined cents
 *   a.multiply(0.20) -> a * 20% (tax)
 */
import { Currency } from './Currency';

export class Money {
  private constructor(
    private readonly minorUnits: number,
    private readonly currency: Currency,
  ) {
    Object.freeze(this);
  }

  static of(amount: number, currencyCode: string): Money {
    return new Money(Currency.of(currencyCode).toMinorUnits(amount), Currency.of(currencyCode));
  }

  static ofMinor(minor: number, currency: Currency): Money {
    if (!Number.isInteger(minor)) {
      throw new Error(`Minor units must be integer: ${minor}`);
    }
    return new Money(minor, currency);
  }

  static zero(currencyCode: string): Money {
    return new Money(0, Currency.of(currencyCode));
  }

  getCurrency(): Currency {
    return this.currency;
  }

  getMinorUnits(): number {
    return this.minorUnits;
  }

  getAmount(): number {
    return this.currency.fromMinorUnits(this.minorUnits);
  }

  add(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    if (!this.currency.equals(other.currency)) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  multiply(factor: number): Money {
    // Round half-up
    return new Money(Math.round(this.minorUnits * factor), this.currency);
  }

  /**
   * Apply a percentage (0-100) and return the amount.
   *   Money.of(100, "USD").percentage(20) -> 20 USD
   */
  percentage(percent: number): Money {
    if (percent < 0 || percent > 100) {
      throw new Error(`Percentage out of range: ${percent}`);
    }
    return this.multiply(percent / 100);
  }

  isZero(): boolean {
    return this.minorUnits === 0;
  }

  isNegative(): boolean {
    return this.minorUnits < 0;
  }

  equals(other: Money): boolean {
    if (!(other instanceof Money)) return false;
    return this.minorUnits === other.minorUnits && this.currency.equals(other.currency);
  }

  compareTo(other: Money): number {
    if (!this.currency.equals(other.currency)) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return this.minorUnits - other.minorUnits;
  }

  toString(): string {
    return `${this.getAmount().toFixed(this.currency.getMinorUnit() > 0 ? 2 : 0)} ${this.currency}`;
  }
}
