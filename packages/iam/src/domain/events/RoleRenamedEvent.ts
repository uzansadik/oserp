import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class RoleRenamedEvent extends DomainEvent {
  readonly eventName = IamEventNames.RoleRenamed;

  constructor(
    public readonly roleId: string,
    public readonly newName: string,
    occurredOn?: Date,
  ) {
    super(roleId, occurredOn);
  }
}
