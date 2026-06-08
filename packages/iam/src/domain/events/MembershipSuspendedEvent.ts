import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class MembershipSuspendedEvent extends DomainEvent {
  readonly eventName = IamEventNames.MembershipSuspended;

  constructor(
    public readonly membershipId: string,
    occurredOn?: Date,
  ) {
    super(membershipId, occurredOn);
  }
}
