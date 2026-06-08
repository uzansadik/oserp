import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class UserEmailVerifiedEvent extends DomainEvent {
  readonly eventName = IamEventNames.UserEmailVerified;

  constructor(
    public readonly userId: string,
    occurredOn?: Date,
  ) {
    super(userId, occurredOn);
  }
}
