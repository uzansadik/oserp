import type { OutboxPort } from '@oserp-community/inventory/application/ports/OutboxPort';
import type IDomainEvent from '@oserp-community/inventory/interfaces/IDomainEvent';

/**
 * In-memory outbox — test'ler ve dev ortamı içindir. Event'leri bir diziye yazar.
 */
export class InMemoryOutbox implements OutboxPort {
  public readonly events: IDomainEvent[] = [];

  async enqueue(events: IDomainEvent[]): Promise<void> {
    this.events.push(...events);
  }

  clear(): void {
    this.events.length = 0;
  }
}
