/**
 * PricingDecision Value Object
 *
 * Immutable result of a pricing calculation: which price list won, what
 * entry was picked, what currency it was in, what discount applied, what
 * the final unit price was. The `trace` field is a human-readable list of
 * steps explaining how we got there (for audit / debugging).
 *
 * Usage:
 *   decision.unitPrice         // final, customer-facing unit price
 *   decision.currency          // final currency
 *   decision.appliedDiscount   // discount detail (or NONE)
 *   decision.appliedPriceList  // which list won
 *   decision.trace             // ['GLOBAL 1.0x', 'CUSTOMER 0.9x', ...]
 */
import { Currency } from './Currency';
import { DiscountType } from './DiscountType';

export interface PricingTraceStep {
  readonly step: number;
  readonly description: string;
}

export class PricingDecision {
  private constructor(
    private readonly productId: string,
    private readonly quantity: number,
    private readonly unitPrice: number,
    private readonly currency: Currency,
    private readonly listPrice: number,
    private readonly appliedDiscount: DiscountType,
    private readonly discountAmount: number,
    private readonly appliedPriceListId: string | null,
    private readonly appliedPriceListCode: string | null,
    private readonly appliedEntryId: string | null,
    private readonly lineSubtotal: number,
    private readonly trace: ReadonlyArray<PricingTraceStep>,
  ) {
    Object.freeze(this);
  }

  static create(props: {
    productId: string;
    quantity: number;
    unitPrice: number;
    currency: Currency;
    listPrice: number;
    appliedDiscount: DiscountType;
    discountAmount: number;
    appliedPriceListId: string | null;
    appliedPriceListCode: string | null;
    appliedEntryId: string | null;
    trace: ReadonlyArray<PricingTraceStep>;
  }): PricingDecision {
    const lineSubtotal = Math.round(props.unitPrice * props.quantity * 100) / 100;
    return new PricingDecision(
      props.productId,
      props.quantity,
      props.unitPrice,
      props.currency,
      props.listPrice,
      props.appliedDiscount,
      props.discountAmount,
      props.appliedPriceListId,
      props.appliedPriceListCode,
      props.appliedEntryId,
      lineSubtotal,
      Object.freeze([...props.trace]),
    );
  }

  getProductId(): string {
    return this.productId;
  }
  getQuantity(): number {
    return this.quantity;
  }
  getUnitPrice(): number {
    return this.unitPrice;
  }
  getCurrency(): Currency {
    return this.currency;
  }
  getListPrice(): number {
    return this.listPrice;
  }
  getAppliedDiscount(): DiscountType {
    return this.appliedDiscount;
  }
  getDiscountAmount(): number {
    return this.discountAmount;
  }
  getAppliedPriceListId(): string | null {
    return this.appliedPriceListId;
  }
  getAppliedPriceListCode(): string | null {
    return this.appliedPriceListCode;
  }
  getAppliedEntryId(): string | null {
    return this.appliedEntryId;
  }
  getLineSubtotal(): number {
    return this.lineSubtotal;
  }
  getTrace(): ReadonlyArray<PricingTraceStep> {
    return this.trace;
  }

  toJSON(): Record<string, unknown> {
    return {
      productId: this.productId,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      currency: this.currency.getCode(),
      listPrice: this.listPrice,
      appliedDiscount: this.appliedDiscount.getKind(),
      discountAmount: this.discountAmount,
      appliedPriceListId: this.appliedPriceListId,
      appliedPriceListCode: this.appliedPriceListCode,
      appliedEntryId: this.appliedEntryId,
      lineSubtotal: this.lineSubtotal,
      trace: this.trace,
    };
  }
}
