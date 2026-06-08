import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class UserCreatedEvent extends DomainEvent {
  readonly eventName = IamEventNames.UserCreated;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    occurredOn?: Date,
  ) {
    super(userId, occurredOn);
  }
}
