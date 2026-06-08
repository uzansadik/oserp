import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class RoleDeactivatedEvent extends DomainEvent {
  readonly eventName = IamEventNames.RoleDeactivated;

  constructor(
    public readonly roleId: string,
    occurredOn?: Date,
  ) {
    super(roleId, occurredOn);
  }
}
