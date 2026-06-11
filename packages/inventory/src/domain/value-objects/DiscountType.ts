/**
 * DiscountType Value Object
 *
 * Strategy for applying a discount on a price list entry.
 *   - PERCENTAGE: discountPercent in [0..100]
 *   - FIXED_AMOUNT: discountAmount in entry's currency, <= unit price
 *   - OVERRIDE_PRICE: ignore list price, use overridePrice (special price / promo)
 *
 * The apply() function reduces a unit price by the discount and returns the
 * discounted unit price. Discount is "stacked" by the caller (we don't auto-
 * compose two discounts; each entry produces a single price decision).
 */
export type DiscountKind = 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE';

export interface DiscountApplyResult {
  finalUnitPrice: number;
  discountApplied: number;
  kind: DiscountKind;
}

export class DiscountType {
  private constructor(private readonly kind: DiscountKind) {
    Object.freeze(this);
  }

  static none(): DiscountType {
    return new DiscountType('NONE');
  }
  static percentage(): DiscountType {
    return new DiscountType('PERCENTAGE');
  }
  static fixedAmount(): DiscountType {
    return new DiscountType('FIXED_AMOUNT');
  }
  static overridePrice(): DiscountType {
    return new DiscountType('OVERRIDE_PRICE');
  }

  static fromKind(kind: DiscountKind): DiscountType {
    switch (kind) {
      case 'NONE':
        return DiscountType.none();
      case 'PERCENTAGE':
        return DiscountType.percentage();
      case 'FIXED_AMOUNT':
        return DiscountType.fixedAmount();
      case 'OVERRIDE_PRICE':
        return DiscountType.overridePrice();
      default:
        throw new Error(`Unknown discount kind: ${kind as string}`);
    }
  }

  getKind(): DiscountKind {
    return this.kind;
  }

  apply(
    listPrice: number,
    opts: { percent?: number | undefined; fixedAmount?: number | undefined; overridePrice?: number | undefined },
  ): DiscountApplyResult {
    switch (this.kind) {
      case 'NONE':
        return { finalUnitPrice: listPrice, discountApplied: 0, kind: 'NONE' };
      case 'PERCENTAGE': {
        const pct = opts.percent ?? 0;
        if (pct < 0 || pct > 100) {
          throw new Error(`Percentage discount out of range: ${pct}`);
        }
        const discount = (listPrice * pct) / 100;
        return {
          finalUnitPrice: roundMoney(listPrice - discount),
          discountApplied: roundMoney(discount),
          kind: 'PERCENTAGE',
        };
      }
      case 'FIXED_AMOUNT': {
        const fix = opts.fixedAmount ?? 0;
        if (fix < 0) {
          throw new Error(`Fixed discount cannot be negative: ${fix}`);
        }
        if (fix > listPrice) {
          throw new Error(`Fixed discount (${fix}) cannot exceed list price (${listPrice})`);
        }
        return {
          finalUnitPrice: roundMoney(listPrice - fix),
          discountApplied: roundMoney(fix),
          kind: 'FIXED_AMOUNT',
        };
      }
      case 'OVERRIDE_PRICE': {
        const ovr = opts.overridePrice ?? listPrice;
        if (ovr < 0) {
          throw new Error(`Override price cannot be negative: ${ovr}`);
        }
        return {
          finalUnitPrice: roundMoney(ovr),
          discountApplied: roundMoney(Math.max(0, listPrice - ovr)),
          kind: 'OVERRIDE_PRICE',
        };
      }
      default:
        throw new Error(`Unhandled discount kind: ${this.kind as string}`);
    }
  }

  equals(other: DiscountType): boolean {
    if (!(other instanceof DiscountType)) return false;
    return this.kind === other.kind;
  }

  toString(): string {
    return this.kind;
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
