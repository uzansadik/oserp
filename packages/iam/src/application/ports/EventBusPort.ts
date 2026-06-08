import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';

export interface EventBusPort {
  publish(event: IDomainEvent): Promise<void>;

  publishAll(events: IDomainEvent[]): Promise<void>;
}
