import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class UserStatusChangedEvent extends DomainEvent {
  readonly eventName = IamEventNames.UserStatusChanged;

  constructor(
    public readonly userId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    occurredOn?: Date,
  ) {
    super(userId, occurredOn);
  }
}
