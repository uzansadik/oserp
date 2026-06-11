/**
 * OrderLine — Immutable per-product snapshot on a SalesOrder
 *
 * Captures the price at the moment the line was added. Subsequent changes
 * to the product master / price lists do NOT retroactively change the line.
 * The line is what gets invoiced, fulfilled, etc.
 *
 * Fields:
 *   - id, salesOrderId, productId, quantity, uom
 *   - unitPrice (Money, snapshot from PricingCalculator)
 *   - discountPercent (line-level discount, applied on top of price list)
 *   - taxPercent (line-level tax, applied AFTER discount)
 *   - lineTotal = unitPrice * qty, then discounted, then taxed
 *   - notes (optional)
 */
import { Money } from '../value-objects/Money';

export interface OrderLineProps {
  id: string;
  salesOrderId: string;
  productId: string;
  productName: string; // snapshot for invoice/receipt
  productSku: string; // snapshot
  quantity: string; // decimal string
  uom: string;
  unitPrice: Money;
  discountPercent: number; // 0-100
  taxPercent: number; // 0-100
  notes: string | null;
  createdAt: Date;
}

export class OrderLine {
  private constructor(private readonly props: OrderLineProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(props: OrderLineProps): OrderLine {
    if (Number(props.quantity) <= 0) {
      throw new Error(`OrderLine quantity must be positive: ${props.quantity}`);
    }
    if (props.discountPercent < 0 || props.discountPercent > 100) {
      throw new Error(`Discount percent out of range: ${props.discountPercent}`);
    }
    if (props.taxPercent < 0 || props.taxPercent > 100) {
      throw new Error(`Tax percent out of range: ${props.taxPercent}`);
    }
    return new OrderLine(props);
  }

  getId(): string {
    return this.props.id;
  }
  getSalesOrderId(): string {
    return this.props.salesOrderId;
  }
  getProductId(): string {
    return this.props.productId;
  }
  getProductName(): string {
    return this.props.productName;
  }
  getProductSku(): string {
    return this.props.productSku;
  }
  getQuantity(): string {
    return this.props.quantity;
  }
  getUom(): string {
    return this.props.uom;
  }
  getUnitPrice(): Money {
    return this.props.unitPrice;
  }
  getDiscountPercent(): number {
    return this.props.discountPercent;
  }
  getTaxPercent(): number {
    return this.props.taxPercent;
  }
  getNotes(): string | null {
    return this.props.notes;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Compute line subtotal: unitPrice * qty (gross).
   */
  getSubtotal(): Money {
    const qty = Math.round(Number(this.props.quantity) * 1000) / 1000; // 3 decimal precision
    return this.props.unitPrice.multiply(qty);
  }

  /**
   * Compute discount amount.
   */
  getDiscountAmount(): Money {
    return this.getSubtotal().percentage(this.props.discountPercent);
  }

  /**
   * Compute taxable base (subtotal - discount).
   */
  getTaxableBase(): Money {
    return this.getSubtotal().subtract(this.getDiscountAmount());
  }

  /**
   * Compute tax amount on the taxable base.
   */
  getTaxAmount(): Money {
    return this.getTaxableBase().percentage(this.props.taxPercent);
  }

  /**
   * Final line total: subtotal - discount + tax.
   */
  getLineTotal(): Money {
    return this.getTaxableBase().add(this.getTaxAmount());
  }
}
