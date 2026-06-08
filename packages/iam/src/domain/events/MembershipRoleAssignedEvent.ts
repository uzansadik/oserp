import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class MembershipRoleAssignedEvent extends DomainEvent {
  readonly eventName = IamEventNames.MembershipRoleAssigned;

  constructor(
    public readonly membershipId: string,
    public readonly roleId: string,
    occurredOn?: Date,
  ) {
    super(membershipId, occurredOn);
  }
}
