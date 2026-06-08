import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class ApiCredentialIssuedEvent extends DomainEvent {
  readonly eventName = IamEventNames.ApiCredentialIssued;

  constructor(
    public readonly apiKeyId: string,
    public readonly companyId: string,
    public readonly prefix: string,
    occurredOn?: Date,
  ) {
    super(apiKeyId, occurredOn);
  }
}
