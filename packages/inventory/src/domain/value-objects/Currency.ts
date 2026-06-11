/**
 * Currency Value Object
 *
 * ISO-4217 currency code (3 uppercase letters). Immutable.
 * Creation validates format. Carries minor unit exponent for rounding rules.
 *
 * Examples:
 *   Currency.of("USD")  -> minorUnit=2 (1.00 USD = 100 cents)
 *   Currency.of("JPY")  -> minorUnit=0 (1 JPY = 1 unit, no minor)
 *   Currency.of("KWD")  -> minorUnit=3 (1 KWD = 1000 fils)
 *
 * MVP scope: only major ISO codes (USD/EUR/GBP/TRY/JPY) used; minor unit hardcoded
 * lookup table. For unsupported codes we default to 2. Production: integrate
 * with full ISO-4217 table at bootstrap.
 */
const KNOWN_MINOR_UNITS: Readonly<Record<string, number>> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  TRY: 2,
  JPY: 0,
  KWD: 3,
  BHD: 3,
};

const CURRENCY_REGEX = /^[A-Z]{3}$/;

export class Currency {
  private constructor(
    private readonly code: string,
    private readonly minorUnit: number,
  ) {
    Object.freeze(this);
  }

  static of(code: string): Currency {
    if (!CURRENCY_REGEX.test(code)) {
      throw new Error(`Invalid currency code: ${code} (expected 3 uppercase letters)`);
    }
    const minorUnit = KNOWN_MINOR_UNITS[code] ?? 2;
    return new Currency(code, minorUnit);
  }

  static tryOf(code: string): Currency | null {
    if (!CURRENCY_REGEX.test(code)) return null;
    return new Currency(code, KNOWN_MINOR_UNITS[code] ?? 2);
  }

  getCode(): string {
    return this.code;
  }

  getMinorUnit(): number {
    return this.minorUnit;
  }

  /**
   * Round a unit amount (e.g. 9.99 USD) to the minor unit multiplier.
   * For USD: round(9.99 * 100) = 999 cents.
   * For JPY: round(9.99 * 1) = 10 JPY.
   */
  toMinorUnits(amount: number): number {
    return Math.round(amount * Math.pow(10, this.minorUnit));
  }

  fromMinorUnits(minor: number): number {
    return minor / Math.pow(10, this.minorUnit);
  }

  equals(other: Currency): boolean {
    if (!(other instanceof Currency)) return false;
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }

  toJSON(): string {
    return this.code;
  }
}
