import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class RolePermissionAssignedEvent extends DomainEvent {
  readonly eventName = IamEventNames.RolePermissionAssigned;

  constructor(
    public readonly roleId: string,
    public readonly permissionCode: string,
    occurredOn?: Date,
  ) {
    super(roleId, occurredOn);
  }
}
