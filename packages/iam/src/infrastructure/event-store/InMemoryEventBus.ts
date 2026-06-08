import type { EventBusPort } from '@oserp-community/iam/application/ports/EventBusPort';
import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';

export type EventHandler = (event: IDomainEvent) => Promise<void> | void;

/**
 * Süreç-içi (in-memory) event bus. Handler testleri ve dev ortamı içindir.
 * Event adına göre kayıtlı handler'ları sırayla çağırır; bir handler hata
 * fırlatsa bile diğer handler'lar çalışmaya devam eder ve hatalar toplanır.
 */
export class InMemoryEventBus implements EventBusPort {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  async publish(event: IDomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? [];
    const errors: unknown[] = [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `Event handler(s) failed for '${event.eventName}'`);
    }
  }

  async publishAll(events: IDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
