import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';

/**
 * Tüm domain event'leri için ortak taban sınıf.
 * `eventName` her alt sınıfta sabitlenir; `aggregateId` event'i üreten
 * aggregate'in kimliğidir (outbox / topic eşlemesi için kullanılır).
 */
export abstract class DomainEvent implements IDomainEvent {
  abstract readonly eventName: string;
  readonly occurredOn: Date;

  protected constructor(
    public readonly aggregateId: string,
    occurredOn?: Date,
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
