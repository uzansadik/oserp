import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class SessionRevokedEvent extends DomainEvent {
  readonly eventName = IamEventNames.SessionRevoked;

  constructor(
    public readonly sessionId: string,
    occurredOn?: Date,
  ) {
    super(sessionId, occurredOn);
  }
}
