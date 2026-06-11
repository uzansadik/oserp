/**
 * InvoiceLine — Immutable per-product line on an Invoice
 *
 * Inherits all fields from OrderLine (which it was generated from) plus:
 *   - orderLineId (back-reference for traceability)
 *   - invoicedQuantity (may differ from order qty for partial fulfillment)
 *   - paidAmount tracking (in Money)
 */
import { Money } from '../value-objects/Money';

export interface InvoiceLineProps {
  id: string;
  invoiceId: string;
  orderLineId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  uom: string;
  unitPrice: Money;
  discountPercent: number;
  taxPercent: number;
  notes: string | null;
  createdAt: Date;
}

export class InvoiceLine {
  private constructor(private readonly props: InvoiceLineProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(props: InvoiceLineProps): InvoiceLine {
    if (Number(props.quantity) <= 0) {
      throw new Error(`InvoiceLine quantity must be positive: ${props.quantity}`);
    }
    return new InvoiceLine(props);
  }

  static fromOrderLine(
    orderLine: import('./OrderLine').OrderLine,
    overrides: { id: string; invoiceId: string; quantity?: string | undefined },
  ): InvoiceLine {
    return InvoiceLine.create({
      id: overrides.id,
      invoiceId: overrides.invoiceId,
      orderLineId: orderLine.getId(),
      productId: orderLine.getProductId(),
      productName: orderLine.getProductName(),
      productSku: orderLine.getProductSku(),
      quantity: overrides.quantity ?? orderLine.getQuantity(),
      uom: orderLine.getUom(),
      unitPrice: orderLine.getUnitPrice(),
      discountPercent: orderLine.getDiscountPercent(),
      taxPercent: orderLine.getTaxPercent(),
      notes: orderLine.getNotes(),
      createdAt: new Date(),
    });
  }

  getId(): string {
    return this.props.id;
  }
  getInvoiceId(): string {
    return this.props.invoiceId;
  }
  getOrderLineId(): string {
    return this.props.orderLineId;
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

  getSubtotal(): Money {
    const qty = Math.round(Number(this.props.quantity) * 1000) / 1000;
    return this.props.unitPrice.multiply(qty);
  }

  getDiscountAmount(): Money {
    return this.getSubtotal().percentage(this.props.discountPercent);
  }

  getTaxableBase(): Money {
    return this.getSubtotal().subtract(this.getDiscountAmount());
  }

  getTaxAmount(): Money {
    return this.getTaxableBase().percentage(this.props.taxPercent);
  }

  getLineTotal(): Money {
    return this.getTaxableBase().add(this.getTaxAmount());
  }
}
