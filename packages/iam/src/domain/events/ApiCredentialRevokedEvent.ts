import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class ApiCredentialRevokedEvent extends DomainEvent {
  readonly eventName = IamEventNames.ApiCredentialRevoked;

  constructor(
    public readonly apiKeyId: string,
    occurredOn?: Date,
  ) {
    super(apiKeyId, occurredOn);
  }
}
