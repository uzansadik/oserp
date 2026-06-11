/**
 * TransferOrder Domain Events
 *
 * Transfer aggregate tarafından üretilen event'ler. InventoryLevel
 * projection (Faz 2'deki StockProjectionService gibi) bu event'leri
 * dinleyerek source.onHand ve target.onHand'i günceller.
 */
import { DomainEvent } from './DomainEvent';

export interface TransferLinePayload {
  productId: string;
  lotId: string | null;
  /** Requested/dispatched/received quantity. */
  quantity: string;
  /** Lot selection (dispatch sırasında atanır). */
  selectedLotId?: string | null;
  /** Variance = dispatched - received (receive sonrası). */
  variance?: string;
  /** UOM. */
  uom?: string;
}

export class TransferCreatedEvent extends DomainEvent {
  readonly eventName = 'TransferCreated';
  constructor(public readonly payload: {
    transferId: string;
    transferNumber: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: ReadonlyArray<{
      productId: string;
      lotId: string | null;
      requestedQuantity: string;
      uom: string;
    }>;
    reason: string | null;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}

export class TransferDispatchedEvent extends DomainEvent {
  readonly eventName = 'TransferDispatched';
  constructor(public readonly payload: {
    transferId: string;
    transferNumber: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: ReadonlyArray<{
      productId: string;
      lotId: string | null;
      dispatchedQuantity: string;
    }>;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}

export class TransferInTransitEvent extends DomainEvent {
  readonly eventName = 'TransferInTransit';
  constructor(public readonly payload: {
    transferId: string;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}

export class TransferReceivedEvent extends DomainEvent {
  readonly eventName = 'TransferReceived';
  constructor(public readonly payload: {
    transferId: string;
    destinationLocationId: string;
    lines: ReadonlyArray<{
      productId: string;
      lotId: string | null;
      receivedQuantity: string;
      variance: string;
    }>;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}

export class TransferClosedEvent extends DomainEvent {
  readonly eventName = 'TransferClosed';
  constructor(public readonly payload: {
    transferId: string;
    totalVariance: string;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}

export class TransferCancelledEvent extends DomainEvent {
  readonly eventName = 'TransferCancelled';
  constructor(public readonly payload: {
    transferId: string;
    reason: string | null;
    occurredAt: Date;
  }) {
    super(payload.transferId, payload.occurredAt);
  }
}
