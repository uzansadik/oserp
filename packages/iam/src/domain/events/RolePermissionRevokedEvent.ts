import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class RolePermissionRevokedEvent extends DomainEvent {
  readonly eventName = IamEventNames.RolePermissionRevoked;

  constructor(
    public readonly roleId: string,
    public readonly permissionCode: string,
    occurredOn?: Date,
  ) {
    super(roleId, occurredOn);
  }
}
