import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class RoleCreatedEvent extends DomainEvent {
  readonly eventName = IamEventNames.RoleCreated;

  constructor(
    public readonly roleId: string,
    public readonly name: string,
    public readonly companyId: string | null,
    public readonly isSystemRole: boolean,
    occurredOn?: Date,
  ) {
    super(roleId, occurredOn);
  }
}
