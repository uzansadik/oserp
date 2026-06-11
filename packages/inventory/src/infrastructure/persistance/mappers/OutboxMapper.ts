import type IDomainEvent from '@oserp-community/inventory/interfaces/IDomainEvent';
import { randomUUID } from 'crypto';

export type OutboxPersistenceModel = {
  id: string;
  eventName: string;
  aggregateId: string;
  payload: string;
  occurredOn: Date;
};

/**
 * Domain event'i outbox satırına dönüştürür. Event'in tüm alanları JSON
 * olarak `payload`'a serileştirilir; publisher bunu okuyup event bus'a yayar.
 */
export function domainEventToOutbox(event: IDomainEvent): OutboxPersistenceModel {
  return {
    id: randomUUID(),
    eventName: event.eventName,
    aggregateId: event.aggregateId,
    payload: JSON.stringify(event),
    occurredOn: event.occurredOn,
  };
}
