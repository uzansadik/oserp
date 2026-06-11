import type { OutboxPort } from '@oserp-community/inventory/application/ports/OutboxPort';
import type IDomainEvent from '@oserp-community/inventory/interfaces/IDomainEvent';
import { domainEventToOutbox } from './mappers/OutboxMapper';
import { invOutbox } from './schemas/inv.outbox.schema';
import type { InventoryDbClient } from './db';

export class DrizzleOutbox implements OutboxPort {
  constructor(private readonly db: InventoryDbClient) {}

  async enqueue(events: IDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db.insert(invOutbox).values(events.map(domainEventToOutbox));
  }
}
