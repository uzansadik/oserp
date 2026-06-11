/**
 * Lot Domain Events
 */
import { DomainEvent } from './DomainEvent';

export class LotCreatedEvent extends DomainEvent {
  readonly eventName = 'LotCreated';
  constructor(public readonly payload: {
    lotId: string;
    productId: string;
    locationId: string;
    quantity: string;
    expiryDate: string | null;
    receivedAt: Date;
    occurredAt: Date;
  }) {
    super(payload.lotId, payload.occurredAt);
  }
}

export class LotConsumedEvent extends DomainEvent {
  readonly eventName = 'LotConsumed';
  constructor(public readonly payload: {
    lotId: string;
    productId: string;
    locationId: string;
    quantity: string;
    remainingQuantity: string;
    occurredAt: Date;
  }) {
    super(payload.lotId, payload.occurredAt);
  }
}

export class LotExpiredEvent extends DomainEvent {
  readonly eventName = 'LotExpired';
  constructor(public readonly payload: {
    productId: string;
    locationId: string;
    count: number;
    atDate: Date;
    occurredAt: Date;
  }) {
    super(`${payload.productId}@${payload.locationId}`, payload.occurredAt);
  }
}

export class LotQuarantinedEvent extends DomainEvent {
  readonly eventName = 'LotQuarantined';
  constructor(public readonly payload: {
    lotId: string;
    productId: string;
    locationId: string;
    reason: string | null;
    occurredAt: Date;
  }) {
    super(payload.lotId, payload.occurredAt);
  }
}

export class SerialNumberAllocatedEvent extends DomainEvent {
  readonly eventName = 'SerialNumberAllocated';
  constructor(public readonly payload: {
    lotId: string;
    productId: string;
    locationId: string;
    count: number;
    occurredAt: Date;
  }) {
    super(payload.lotId, payload.occurredAt);
  }
}
