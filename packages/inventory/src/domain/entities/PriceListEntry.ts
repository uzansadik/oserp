/**
 * PriceListEntry — Immutable per-product price record
 *
 * Each PriceList contains N entries; each entry fixes a unit price for one
 * product in one currency, optionally with a discount (percentage / fixed /
 * override). Entries are immutable: changing a price means adding a new
 * entry with a new effectiveFrom date (a-la time-bounded pricing).
 *
 * Effective window: [effectiveFrom, effectiveTo). Same product can have
 * multiple entries on the same list with non-overlapping windows (price
 * schedule). The active entry at time T is the one with the latest
 * effectiveFrom <= T < effectiveTo (or no effectiveTo).
 */
import { Currency } from '../value-objects/Currency';
import { DiscountType } from '../value-objects/DiscountType';

export interface PriceListEntryProps {
  id: string;
  priceListId: string;
  productId: string;
  unitPrice: number;
  currency: Currency;
  discount: DiscountType;
  discountPercent?: number | null;
  discountFixedAmount?: number | null;
  overridePrice?: number | null;
  minQuantity: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
}

export class PriceListEntry {
  private constructor(private readonly props: PriceListEntryProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(props: PriceListEntryProps): PriceListEntry {
    if (props.unitPrice < 0) {
      throw new Error(`unitPrice cannot be negative: ${props.unitPrice}`);
    }
    if (props.minQuantity < 1) {
      throw new Error(`minQuantity must be >= 1: ${props.minQuantity}`);
    }
    if (props.effectiveTo && props.effectiveTo <= props.effectiveFrom) {
      throw new Error('effectiveTo must be after effectiveFrom');
    }
    if (props.discount.getKind() === 'PERCENTAGE' && props.discountPercent == null) {
      throw new Error('PERCENTAGE discount requires discountPercent');
    }
    if (props.discount.getKind() === 'FIXED_AMOUNT' && props.discountFixedAmount == null) {
      throw new Error('FIXED_AMOUNT discount requires discountFixedAmount');
    }
    if (props.discount.getKind() === 'OVERRIDE_PRICE' && props.overridePrice == null) {
      throw new Error('OVERRIDE_PRICE discount requires overridePrice');
    }
    return new PriceListEntry(props);
  }

  getId(): string {
    return this.props.id;
  }
  getPriceListId(): string {
    return this.props.priceListId;
  }
  getProductId(): string {
    return this.props.productId;
  }
  getUnitPrice(): number {
    return this.props.unitPrice;
  }
  getCurrency(): Currency {
    return this.props.currency;
  }
  getDiscount(): DiscountType {
    return this.props.discount;
  }
  getDiscountPercent(): number | null {
    return this.props.discountPercent ?? null;
  }
  getDiscountFixedAmount(): number | null {
    return this.props.discountFixedAmount ?? null;
  }
  getOverridePrice(): number | null {
    return this.props.overridePrice ?? null;
  }
  getMinQuantity(): number {
    return this.props.minQuantity;
  }
  getEffectiveFrom(): Date {
    return this.props.effectiveFrom;
  }
  getEffectiveTo(): Date | null {
    return this.props.effectiveTo;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  isActiveAt(at: Date): boolean {
    if (at < this.props.effectiveFrom) return false;
    if (this.props.effectiveTo && at >= this.props.effectiveTo) return false;
    return true;
  }

  matchesQuantity(quantity: number): boolean {
    return quantity >= this.props.minQuantity;
  }

  computeDiscountedPrice(): number {
    return this.props.discount.apply(this.props.unitPrice, {
      percent: this.props.discountPercent ?? undefined,
      fixedAmount: this.props.discountFixedAmount ?? undefined,
      overridePrice: this.props.overridePrice ?? undefined,
    }).finalUnitPrice;
  }
}
