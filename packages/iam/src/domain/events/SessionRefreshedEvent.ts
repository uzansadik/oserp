import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class SessionRefreshedEvent extends DomainEvent {
  readonly eventName = IamEventNames.SessionRefreshed;

  constructor(
    public readonly sessionId: string,
    public readonly expiresAt: Date,
    occurredOn?: Date,
  ) {
    super(sessionId, occurredOn);
  }
}
