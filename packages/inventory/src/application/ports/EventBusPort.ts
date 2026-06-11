import type IDomainEvent from '../../interfaces/IDomainEvent';

export interface EventBusPort {
  publish(event: IDomainEvent): Promise<void>;

  publishAll(events: IDomainEvent[]): Promise<void>;
}
