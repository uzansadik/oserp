import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class ApiCredentialRotatedEvent extends DomainEvent {
  readonly eventName = IamEventNames.ApiCredentialRotated;

  constructor(
    public readonly apiKeyId: string,
    occurredOn?: Date,
  ) {
    super(apiKeyId, occurredOn);
  }
}
