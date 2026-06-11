/**
 * Reservation Domain Events
 *
 * Reservation aggregate tarafından üretilen event'ler. InventoryLevel
 * reservation tarafını dinleyerek reserved/onHand sayılarını günceller.
 */
import { DomainEvent } from './DomainEvent';

export interface ReservationLinePayload {
  productId: string;
  locationId: string;
  lotId: string | null;
  quantity: string;
  uom: string;
  lotAllocations?: ReadonlyArray<{ lotId: string | null; quantity: string }>;
}

export class ReservationCreatedEvent extends DomainEvent {
  readonly eventName = 'ReservationCreated';
  constructor(public readonly payload: {
    reservationId: string;
    orderId: string;
    customerId: string;
    lines: ReadonlyArray<ReservationLinePayload>;
    expiresAt: Date | null;
    occurredAt: Date;
  }) {
    super(payload.reservationId, payload.occurredAt);
  }
}

export class ReservationCommittedEvent extends DomainEvent {
  readonly eventName = 'ReservationCommitted';
  constructor(public readonly payload: {
    reservationId: string;
    orderId: string;
    lines: ReadonlyArray<{
      productId: string;
      locationId: string;
      quantity: string;
    }>;
    occurredAt: Date;
  }) {
    super(payload.reservationId, payload.occurredAt);
  }
}

export class ReservationReleasedEvent extends DomainEvent {
  readonly eventName = 'ReservationReleased';
  constructor(public readonly payload: {
    reservationId: string;
    orderId: string;
    reason: string;
    lines: ReadonlyArray<{
      productId: string;
      locationId: string;
      quantity: string;
    }>;
    occurredAt: Date;
  }) {
    super(payload.reservationId, payload.occurredAt);
  }
}
