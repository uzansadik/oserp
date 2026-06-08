import { DomainEvent } from './DomainEvent';
import { IamEventNames } from './EventNames';

export class MembershipGrantedEvent extends DomainEvent {
  readonly eventName = IamEventNames.MembershipGranted;

  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly companyId: string,
    occurredOn?: Date,
  ) {
    super(membershipId, occurredOn);
  }
}
