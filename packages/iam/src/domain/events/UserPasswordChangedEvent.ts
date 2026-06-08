import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class UserPasswordChangedEvent extends DomainEvent {
  readonly eventName = IamEventNames.UserPasswordChanged;

  constructor(
    public readonly userId: string,
    occurredOn?: Date,
  ) {
    super(userId, occurredOn);
  }
}
