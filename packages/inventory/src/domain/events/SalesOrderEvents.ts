/**
 * SalesOrder + Invoice Domain Events
 */
import { DomainEvent } from './DomainEvent';

export class OrderCreatedEvent extends DomainEvent {
  readonly eventName = 'OrderCreated';
  constructor(public readonly payload: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    currencyCode: string;
    occurredAt: Date;
  }) {
    super(payload.orderId, payload.occurredAt);
  }
}

export class OrderLineAddedEvent extends DomainEvent {
  readonly eventName = 'OrderLineAdded';
  constructor(public readonly payload: {
    orderId: string;
    lineId: string;
    productId: string;
    quantity: string;
    unitPrice: number;
    currencyCode: string;
    occurredAt: Date;
  }) {
    super(payload.orderId, payload.occurredAt);
  }
}

export class OrderConfirmedEvent extends DomainEvent {
  readonly eventName = 'OrderConfirmed';
  constructor(public readonly payload: {
    orderId: string;
    orderNumber: string;
    total: number;
    currencyCode: string;
    occurredAt: Date;
  }) {
    super(payload.orderId, payload.occurredAt);
  }
}

export class OrderFulfilledEvent extends DomainEvent {
  readonly eventName = 'OrderFulfilled';
  constructor(public readonly payload: {
    orderId: string;
    orderNumber: string;
    occurredAt: Date;
  }) {
    super(payload.orderId, payload.occurredAt);
  }
}

export class OrderCancelledEvent extends DomainEvent {
  readonly eventName = 'OrderCancelled';
  constructor(public readonly payload: {
    orderId: string;
    orderNumber: string;
    reason: string | null;
    occurredAt: Date;
  }) {
    super(payload.orderId, payload.occurredAt);
  }
}

export class InvoiceCreatedEvent extends DomainEvent {
  readonly eventName = 'InvoiceCreated';
  constructor(public readonly payload: {
    invoiceId: string;
    invoiceNumber: string;
    salesOrderId: string;
    customerId: string;
    total: number;
    currencyCode: string;
    occurredAt: Date;
  }) {
    super(payload.invoiceId, payload.occurredAt);
  }
}

export class InvoiceIssuedEvent extends DomainEvent {
  readonly eventName = 'InvoiceIssued';
  constructor(public readonly payload: {
    invoiceId: string;
    invoiceNumber: string;
    occurredAt: Date;
  }) {
    super(payload.invoiceId, payload.occurredAt);
  }
}

export class InvoicePaidEvent extends DomainEvent {
  readonly eventName = 'InvoicePaid';
  constructor(public readonly payload: {
    invoiceId: string;
    invoiceNumber: string;
    totalPaid: number;
    occurredAt: Date;
  }) {
    super(payload.invoiceId, payload.occurredAt);
  }
}

export class InvoiceVoidedEvent extends DomainEvent {
  readonly eventName = 'InvoiceVoided';
  constructor(public readonly payload: {
    invoiceId: string;
    invoiceNumber: string;
    reason: string | null;
    occurredAt: Date;
  }) {
    super(payload.invoiceId, payload.occurredAt);
  }
}

export class PaymentRecordedEvent extends DomainEvent {
  readonly eventName = 'PaymentRecorded';
  constructor(public readonly payload: {
    invoiceId: string;
    paymentId: string;
    amount: number;
    currencyCode: string;
    method: string;
    paidAt: Date;
  }) {
    super(payload.invoiceId, payload.paidAt);
  }
}
