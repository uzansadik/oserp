/**
 * Money — Tutar + para birimi value object (immutable).
 *
 * Decimal hassasiyet için içerde `bigint` tutulur; `scale` ondalık hane
 * sayısıdır (default 6, ERP standardı). Dışarıya string olarak verilir
 * (Drizzle `numeric` zaten string döner).
 *
 * Örnek: amount="123.450000" → 123_450_000n
 */
export class Money {
  private readonly _amount: bigint;
  private readonly _currency: string;
  private readonly _scale: number;

  private constructor(amount: bigint, currency: string, scale: number) {
    this._amount = amount;
    this._currency = currency;
    this._scale = scale;
  }

  /** Tutarı string olarak alır (örn: "123.45"), ISO 4217 currency. */
  static create(amount: string, currency: string, scale = 6): Money {
    if (!/^-?\d+(\.\d+)?$/.test(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error(`Invalid currency (ISO 4217): ${currency}`);
    }
    const negative = amount.startsWith('-');
    const abs = negative ? amount.slice(1) : amount;
    const parts = abs.split('.');
    const intPart = parts[0] ?? '0';
    const decPart = parts[1] ?? '';
    if (decPart.length > scale) {
      throw new Error(`Scale overflow: max ${scale} decimals`);
    }
    const padded = decPart.padEnd(scale, '0');
    const big = BigInt(`${intPart}${padded}`);
    return new Money(negative ? -big : big, currency, scale);
  }

  static zero(currency: string, scale = 6): Money {
    return new Money(0n, currency, scale);
  }

  get amount(): bigint {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  get scale(): number {
    return this._scale;
  }

  /** "123.450000" formatında string (DB'ye yazım için). */
  toString(): string {
    const negative = this._amount < 0n;
    const abs = negative ? -this._amount : this._amount;
    const s = abs.toString().padStart(this._scale + 1, '0');
    const intPart = s.slice(0, s.length - this._scale) || '0';
    const decPart = s.slice(s.length - this._scale);
    return `${negative ? '-' : ''}${intPart}.${decPart}`;
  }

  get value(): string {
    return this.toString();
  }

  static equals(a: Money, b: Money): boolean {
    return a._amount === b._amount && a._currency === b._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency, this._scale);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency, this._scale);
  }

  multiply(factor: number): Money {
    if (Number.isNaN(factor) || !Number.isFinite(factor)) {
      throw new Error(`Invalid factor: ${factor}`);
    }
    const big = BigInt(Math.round(factor * 10 ** this._scale));
    const product = (this._amount * big) / 10n ** BigInt(this._scale);
    return new Money(product, this._currency, this._scale);
  }

  isNegative(): boolean {
    return this._amount < 0n;
  }

  isZero(): boolean {
    return this._amount === 0n;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }
}
