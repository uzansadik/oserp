import type IDomainEvent from '@oserp-community/inventory/interfaces/IDomainEvent';

export abstract class AggregateRoot {
  private domainEvents: IDomainEvent[] = [];

  protected addDomainEvent(event: IDomainEvent): void {
    this.domainEvents.push(event);
  }

  public getDomainEvents(): IDomainEvent[] {
    return this.domainEvents;
  }

  public clearDomainEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Convenience: event'leri atomik olarak al ve temizle.
   * Outbox'a yazım aşamasında tek seferde çağrılır.
   */
  public pullDomainEvents(): IDomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
