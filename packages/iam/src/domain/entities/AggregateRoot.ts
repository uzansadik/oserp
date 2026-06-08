import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';

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
}
