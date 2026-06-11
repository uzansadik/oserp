export default interface IDomainEvent {
  readonly occurredOn: Date;
  readonly eventName: string;
  readonly aggregateId: string;
}
