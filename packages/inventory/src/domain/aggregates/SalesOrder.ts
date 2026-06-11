/**
 * SalesOrder Aggregate
 *
 * Manages a customer order through its lifecycle. Lines are immutable
 * snapshots of the price at the moment they were added. Total amounts
 * are computed on demand from the lines.
 *
 * State machine:
 *   DRAFT → CONFIRMED → FULFILLED → INVOICED → CLOSED
 *                                              ↑ (auto when fully invoiced)
 *   any non-INVOICED state → CANCELLED
 *
 * Invariants:
 *   - DRAFT can have lines added/removed
 *   - CONFIRMED cannot mutate lines (price frozen)
 *   - INVOICED keeps lines immutable forever (audit)
 *   - At least one line is required to CONFIRM
 */
import { AggregateRoot } from '../entities/AggregateRoot';
import { OrderLine, type OrderLineProps } from '../entities/OrderLine';
import { CustomerRef } from '../value-objects/SalesOrderId';
import { SalesOrderId } from '../value-objects/SalesOrderId';
import { Money } from '../value-objects/Money';
import { OrderStatus } from '../value-objects/SalesStatus';
import {
  OrderCreatedEvent,
  OrderLineAddedEvent,
  OrderConfirmedEvent,
  OrderFulfilledEvent,
  OrderCancelledEvent,
} from '../events/SalesOrderEvents';

export interface SalesOrderProps {
  id: SalesOrderId;
  orderNumber: string;
  customer: CustomerRef;
  status: OrderStatus;
  currencyCode: string;
  lines: ReadonlyArray<OrderLine>;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  version: number;
}

export class SalesOrder extends AggregateRoot {
  private constructor(private readonly props: SalesOrderProps) {
    super();
    Object.freeze(this.props.lines);
    // No Object.freeze(this) — AggregateRoot mutates domainEvents.
  }

  static create(opts: {
    id: string;
    orderNumber: string;
    customer: CustomerRef;
    currencyCode: string;
    notes?: string | null;
  }): SalesOrder {
    if (!opts.orderNumber) throw new Error('orderNumber required');
    const now = new Date();
    const order = new SalesOrder({
      id: SalesOrderId.of(opts.id),
      orderNumber: opts.orderNumber,
      customer: opts.customer,
      status: OrderStatus.draft(),
      currencyCode: opts.currencyCode,
      lines: [],
      notes: opts.notes ?? null,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
      version: 1,
    });
    order.addDomainEvent(
      new OrderCreatedEvent({
        orderId: opts.id,
        orderNumber: opts.orderNumber,
        customerId: opts.customer.getCustomerId(),
        currencyCode: opts.currencyCode,
        occurredAt: now,
      }),
    );
    return order;
  }

  static rehydrate(props: SalesOrderProps): SalesOrder {
    return new SalesOrder(props);
  }

  getId(): SalesOrderId {
    return this.props.id;
  }
  getOrderNumber(): string {
    return this.props.orderNumber;
  }
  getCustomer(): CustomerRef {
    return this.props.customer;
  }
  getStatus(): OrderStatus {
    return this.props.status;
  }
  getCurrencyCode(): string {
    return this.props.currencyCode;
  }
  getLines(): ReadonlyArray<OrderLine> {
    return this.props.lines;
  }
  getNotes(): string | null {
    return this.props.notes;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }
  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }
  getConfirmedAt(): Date | null {
    return this.props.confirmedAt;
  }
  getFulfilledAt(): Date | null {
    return this.props.fulfilledAt;
  }
  getCancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  getVersion(): number {
    return this.props.version;
  }

  // --- Behavior ---

  addLine(line: OrderLine): void {
    if (this.props.status.getKind() !== 'DRAFT') {
      throw new Error(`Cannot add line to order in status ${this.props.status}`);
    }
    if (!line.getUnitPrice().getCurrency().getCode().toLowerCase().includes(this.props.currencyCode.toLowerCase())) {
      // Currency must match order's currency
      if (line.getUnitPrice().getCurrency().getCode() !== this.props.currencyCode) {
        throw new Error(
          `Line currency ${line.getUnitPrice().getCurrency()} != order ${this.props.currencyCode}`,
        );
      }
    }
    const newLines = [...this.props.lines, line];
    this.props.lines = Object.freeze(newLines) as ReadonlyArray<OrderLine>;
    this.props.updatedAt = new Date();
    this.props.version += 1;
    this.addDomainEvent(
      new OrderLineAddedEvent({
        orderId: this.props.id.getValue(),
        lineId: line.getId(),
        productId: line.getProductId(),
        quantity: line.getQuantity(),
        unitPrice: line.getUnitPrice().getAmount(),
        currencyCode: line.getUnitPrice().getCurrency().getCode(),
        occurredAt: new Date(),
      }),
    );
  }

  removeLine(lineId: string): void {
    if (this.props.status.getKind() !== 'DRAFT') {
      throw new Error(`Cannot remove line from order in status ${this.props.status}`);
    }
    const filtered = this.props.lines.filter((l) => l.getId() !== lineId);
    if (filtered.length === this.props.lines.length) {
      throw new Error(`Line not found: ${lineId}`);
    }
    this.props.lines = Object.freeze(filtered) as ReadonlyArray<OrderLine>;
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  confirm(): void {
    if (this.props.status.getKind() !== 'DRAFT') {
      throw new Error(`Cannot confirm order in status ${this.props.status}`);
    }
    if (this.props.lines.length === 0) {
      throw new Error('Cannot confirm order without lines');
    }
    const now = new Date();
    this.props.status = OrderStatus.confirmed();
    this.props.confirmedAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new OrderConfirmedEvent({
        orderId: this.props.id.getValue(),
        orderNumber: this.props.orderNumber,
        total: this.getTotal().getAmount(),
        currencyCode: this.props.currencyCode,
        occurredAt: now,
      }),
    );
  }

  fulfill(): void {
    if (this.props.status.getKind() !== 'CONFIRMED') {
      throw new Error(`Cannot fulfill order in status ${this.props.status}`);
    }
    const now = new Date();
    this.props.status = OrderStatus.fulfilled();
    this.props.fulfilledAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new OrderFulfilledEvent({
        orderId: this.props.id.getValue(),
        orderNumber: this.props.orderNumber,
        occurredAt: now,
      }),
    );
  }

  markInvoiced(): void {
    if (this.props.status.getKind() !== 'CONFIRMED' && this.props.status.getKind() !== 'FULFILLED') {
      throw new Error(`Cannot mark invoiced in status ${this.props.status}`);
    }
    this.props.status = OrderStatus.invoiced();
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  close(): void {
    if (this.props.status.getKind() !== 'INVOICED') {
      throw new Error(`Cannot close order in status ${this.props.status}`);
    }
    this.props.status = OrderStatus.closed();
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  cancel(reason: string | null = null): void {
    if (!this.props.status.canTransitionTo(OrderStatus.cancelled())) {
      throw new Error(`Cannot cancel order in status ${this.props.status}`);
    }
    const now = new Date();
    this.props.status = OrderStatus.cancelled();
    this.props.cancelledAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new OrderCancelledEvent({
        orderId: this.props.id.getValue(),
        orderNumber: this.props.orderNumber,
        reason,
        occurredAt: now,
      }),
    );
  }

  // --- Totals ---

  /**
   * Sum of all line subtotals (gross, before discount and tax).
   */
  getSubtotal(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines
      .map((l) => l.getSubtotal())
      .reduce((acc, m) => acc.add(m));
  }

  getTotalDiscount(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines
      .map((l) => l.getDiscountAmount())
      .reduce((acc, m) => acc.add(m));
  }

  getTotalTax(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines
      .map((l) => l.getTaxAmount())
      .reduce((acc, m) => acc.add(m));
  }

  getTotal(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines
      .map((l) => l.getLineTotal())
      .reduce((acc, m) => acc.add(m));
  }

  // --- Factory helper ---

  static makeLineProps(opts: {
    id: string;
    salesOrderId: string;
    productId: string;
    productName: string;
    productSku: string;
    quantity: string;
    uom: string;
    unitPrice: Money;
    discountPercent?: number;
    taxPercent?: number;
    notes?: string | null;
  }): OrderLineProps {
    return {
      id: opts.id,
      salesOrderId: opts.salesOrderId,
      productId: opts.productId,
      productName: opts.productName,
      productSku: opts.productSku,
      quantity: opts.quantity,
      uom: opts.uom,
      unitPrice: opts.unitPrice,
      discountPercent: opts.discountPercent ?? 0,
      taxPercent: opts.taxPercent ?? 0,
      notes: opts.notes ?? null,
      createdAt: new Date(),
    };
  }
}
