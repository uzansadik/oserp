/**
 * PriceList Domain Events
 */
import { DomainEvent } from './DomainEvent';

export class PriceListCreatedEvent extends DomainEvent {
  readonly eventName = 'PriceListCreated';
  constructor(public readonly payload: {
    priceListId: string;
    code: string;
    name: string;
    scope: string;
    baseCurrency: string;
    activeFrom: Date;
    activeTo: Date | null;
    occurredAt: Date;
  }) {
    super(payload.priceListId, payload.occurredAt);
  }
}

export class PriceListEntryAddedEvent extends DomainEvent {
  readonly eventName = 'PriceListEntryAdded';
  constructor(public readonly payload: {
    priceListId: string;
    entryId: string;
    productId: string;
    unitPrice: number;
    currency: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    occurredAt: Date;
  }) {
    super(payload.priceListId, payload.occurredAt);
  }
}

export class PriceListEntryUpdatedEvent extends DomainEvent {
  readonly eventName = 'PriceListEntryUpdated';
  constructor(public readonly payload: {
    priceListId: string;
    oldEntryId: string;
    newEntryId: string;
    productId: string;
    newUnitPrice: number;
    occurredAt: Date;
  }) {
    super(payload.priceListId, payload.occurredAt);
  }
}

export class PriceListArchivedEvent extends DomainEvent {
  readonly eventName = 'PriceListArchived';
  constructor(public readonly payload: {
    priceListId: string;
    code: string;
    occurredAt: Date;
  }) {
    super(payload.priceListId, payload.occurredAt);
  }
}

export class ExchangeRateChangedEvent extends DomainEvent {
  readonly eventName = 'ExchangeRateChanged';
  constructor(public readonly payload: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveFrom: Date;
    occurredAt: Date;
  }) {
    super(`${payload.fromCurrency}->${payload.toCurrency}`, payload.occurredAt);
  }
}
