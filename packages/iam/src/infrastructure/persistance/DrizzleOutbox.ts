import type { OutboxPort } from '@oserp-community/iam/application/ports/OutboxPort';
import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';
import type { IamDbClient } from './db';
import { domainEventToOutbox } from './mappers/OutboxMapper';
import { iamOutbox } from './schemas/iam.outbox.schema';

export class DrizzleOutbox implements OutboxPort {
  constructor(private readonly db: IamDbClient) {}

  async enqueue(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db.insert(iamOutbox).values(events.map(domainEventToOutbox));
  }
}
