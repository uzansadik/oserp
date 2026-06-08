import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class SessionStartedEvent extends DomainEvent {
  readonly eventName = IamEventNames.SessionStarted;

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly expiresAt: Date,
    occurredOn?: Date,
  ) {
    super(sessionId, occurredOn);
  }
}
