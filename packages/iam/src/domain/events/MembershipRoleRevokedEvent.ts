import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class MembershipRoleRevokedEvent extends DomainEvent {
  readonly eventName = IamEventNames.MembershipRoleRevoked;

  constructor(
    public readonly membershipId: string,
    public readonly roleId: string,
    occurredOn?: Date,
  ) {
    super(membershipId, occurredOn);
  }
}
