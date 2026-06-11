/**
 * DTOs: SalesOrder + Invoice
 */
import { OrderLine } from '../../domain/entities/OrderLine';
import { OrderStatus } from '../../domain/value-objects/SalesStatus';
import { SalesOrder } from '../../domain/aggregates/SalesOrder';
import { Invoice, type PaymentEntry } from '../../domain/aggregates/Invoice';
import { InvoiceLine } from '../../domain/entities/InvoiceLine';
import { InvoiceStatus } from '../../domain/value-objects/SalesStatus';
import { OrderLine as OrderLineEntity } from '../../domain/entities/OrderLine';
import { Money } from '../../domain/value-objects/Money';

export interface CreateOrderDTO {
  id: string;
  orderNumber?: string;
  customerId: string;
  customerGroupId?: string | null;
  currencyCode: string;
  notes?: string | null;
}

export interface AddOrderLineDTO {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  uom: string;
  unitPrice?: number;
  currencyCode?: string;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string | null;
  /** If unitPrice is omitted, the service will resolve it via PricingCalculator */
  resolvePrice?: boolean;
}

export interface CancelOrderDTO {
  orderId: string;
  reason?: string | null;
}

export interface CreateInvoiceFromOrderDTO {
  id: string;
  invoiceNumber?: string;
  salesOrderId: string;
  dueDate?: string | null;
  notes?: string | null;
}

export interface RecordPaymentDTO {
  id: string;
  invoiceId: string;
  amount: number;
  currencyCode: string;
  method: string;
  reference?: string | null;
}

export interface VoidInvoiceDTO {
  invoiceId: string;
  reason?: string | null;
}

export interface OrderLineView {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  uom: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
  currencyCode: string;
}

export function orderLineToView(l: OrderLine): OrderLineView {
  return {
    id: l.getId(),
    productId: l.getProductId(),
    productName: l.getProductName(),
    productSku: l.getProductSku(),
    quantity: l.getQuantity(),
    uom: l.getUom(),
    unitPrice: l.getUnitPrice().getAmount(),
    discountPercent: l.getDiscountPercent(),
    taxPercent: l.getTaxPercent(),
    lineTotal: l.getLineTotal().getAmount(),
    currencyCode: l.getUnitPrice().getCurrency().getCode(),
  };
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  customer: { customerId: string; customerGroupId: string | null };
  currencyCode: string;
  lineCount: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  version: number;
  lines: OrderLineView[];
}

export function orderToView(o: SalesOrder): OrderView {
  return {
    id: o.getId().getValue(),
    orderNumber: o.getOrderNumber(),
    status: o.getStatus().getKind(),
    customer: {
      customerId: o.getCustomer().getCustomerId(),
      customerGroupId: o.getCustomer().getCustomerGroupId(),
    },
    currencyCode: o.getCurrencyCode(),
    lineCount: o.getLines().length,
    subtotal: o.getSubtotal().getAmount(),
    totalDiscount: o.getTotalDiscount().getAmount(),
    totalTax: o.getTotalTax().getAmount(),
    total: o.getTotal().getAmount(),
    notes: o.getNotes(),
    createdAt: o.getCreatedAt().toISOString(),
    updatedAt: o.getUpdatedAt().toISOString(),
    confirmedAt: o.getConfirmedAt() ? o.getConfirmedAt()!.toISOString() : null,
    fulfilledAt: o.getFulfilledAt() ? o.getFulfilledAt()!.toISOString() : null,
    cancelledAt: o.getCancelledAt() ? o.getCancelledAt()!.toISOString() : null,
    version: o.getVersion(),
    lines: o.getLines().map(orderLineToView),
  };
}

export interface InvoiceLineView {
  id: string;
  orderLineId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  uom: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
  currencyCode: string;
}

export function invoiceLineToView(l: InvoiceLine): InvoiceLineView {
  return {
    id: l.getId(),
    orderLineId: l.getOrderLineId(),
    productId: l.getProductId(),
    productName: l.getProductName(),
    productSku: l.getProductSku(),
    quantity: l.getQuantity(),
    uom: l.getUom(),
    unitPrice: l.getUnitPrice().getAmount(),
    discountPercent: l.getDiscountPercent(),
    taxPercent: l.getTaxPercent(),
    lineTotal: l.getLineTotal().getAmount(),
    currencyCode: l.getUnitPrice().getCurrency().getCode(),
  };
}

export interface PaymentEntryView {
  id: string;
  amount: number;
  currencyCode: string;
  method: string;
  reference: string | null;
  paidAt: string;
}

export function paymentToView(p: PaymentEntry): PaymentEntryView {
  return {
    id: p.id,
    amount: p.amount.getAmount(),
    currencyCode: p.amount.getCurrency().getCode(),
    method: p.method,
    reference: p.reference,
    paidAt: p.paidAt.toISOString(),
  };
}

export interface InvoiceView {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  status: string;
  customerId: string;
  currencyCode: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  isFullyPaid: boolean;
  paymentCount: number;
  notes: string | null;
  createdAt: string;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  dueDate: string | null;
  version: number;
  lines: InvoiceLineView[];
  payments: PaymentEntryView[];
}

export function invoiceToView(i: Invoice): InvoiceView {
  return {
    id: i.getId().getValue(),
    invoiceNumber: i.getInvoiceNumber(),
    salesOrderId: i.getSalesOrderId(),
    status: i.getStatus().getKind(),
    customerId: i.getCustomerId(),
    currencyCode: i.getCurrencyCode(),
    subtotal: i.getSubtotal().getAmount(),
    totalDiscount: i.getTotalDiscount().getAmount(),
    totalTax: i.getTotalTax().getAmount(),
    total: i.getTotal().getAmount(),
    paidAmount: i.getPaidAmount().getAmount(),
    outstandingAmount: i.getOutstandingAmount().getAmount(),
    isFullyPaid: i.isFullyPaid(),
    paymentCount: i.getPayments().length,
    notes: i.getNotes(),
    createdAt: i.getCreatedAt().toISOString(),
    issuedAt: i.getIssuedAt() ? i.getIssuedAt()!.toISOString() : null,
    paidAt: i.getPaidAt() ? i.getPaidAt()!.toISOString() : null,
    voidedAt: i.getVoidedAt() ? i.getVoidedAt()!.toISOString() : null,
    dueDate: i.getDueDate() ? i.getDueDate()!.toISOString() : null,
    version: i.getVersion(),
    lines: i.getLines().map(invoiceLineToView),
    payments: i.getPayments().map(paymentToView),
  };
}

export function makeOrderLine(props: {
  id: string;
  salesOrderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: string;
  uom: string;
  unitPriceAmount: number;
  currencyCode: string;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string | null;
}): OrderLineEntity {
  return OrderLine.create({
    id: props.id,
    salesOrderId: props.salesOrderId,
    productId: props.productId,
    productName: props.productName,
    productSku: props.productSku,
    quantity: props.quantity,
    uom: props.uom,
    unitPrice: Money.of(props.unitPriceAmount, props.currencyCode),
    discountPercent: props.discountPercent ?? 0,
    taxPercent: props.taxPercent ?? 0,
    notes: props.notes ?? null,
    createdAt: new Date(),
  });
}
