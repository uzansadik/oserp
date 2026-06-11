import type IDomainEvent from '../../interfaces/IDomainEvent';

export type OutboxRecord = {
  id: string;
  eventName: string;
  aggregateId: string;
  payload: string;
  occurredOn: Date;
};

/**
 * Transactional Outbox port'u. Domain event'leri, aggregate'i değiştiren
 * aynı veritabanı transaction'ı içinde kalıcı hale getirir; ayrı bir publisher
 * bunları drenaj edip event bus'a yayar.
 */
export interface OutboxPort {
  enqueue(events: IDomainEvent[]): Promise<void>;
}
