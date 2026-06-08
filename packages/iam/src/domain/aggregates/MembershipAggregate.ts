import { MembershipGrantedEvent } from '@oserp-community/iam/domain/events/MembershipGrantedEvent';
import { MembershipRoleAssignedEvent } from '@oserp-community/iam/domain/events/MembershipRoleAssignedEvent';
import { MembershipRoleRevokedEvent } from '@oserp-community/iam/domain/events/MembershipRoleRevokedEvent';
import { MembershipSuspendedEvent } from '@oserp-community/iam/domain/events/MembershipSuspendedEvent';
import { AggregateRoot } from '../entities/AggregateRoot';
import type { CompanyId } from '../value-objects/CompanyId';
import { MembershipId } from '../value-objects/MembershipId';
import type { RoleId } from '../value-objects/RoleId';
import type { UserId } from '../value-objects/UserId';

export type MembershipStatus = 'active' | 'suspended';

export type CreateMembershipProps = {
  userId: UserId;
  companyId: CompanyId;
  roleIds?: RoleId[];
};

export type ReconstituteMembershipProps = {
  id: MembershipId;
  userId: UserId;
  companyId: CompanyId;
  roleIds: string[];
  status: MembershipStatus;
};

export class MembershipAggregate extends AggregateRoot {
  private readonly roleIds: Set<string>;

  private constructor(
    private readonly id: MembershipId,
    private readonly userId: UserId,
    private readonly companyId: CompanyId,
    roleIds: Set<string>,
    private status: MembershipStatus,
  ) {
    super();
    this.roleIds = roleIds;
  }

  static grant(props: CreateMembershipProps): MembershipAggregate {
    const membership = new MembershipAggregate(
      MembershipId.generate(),
      props.userId,
      props.companyId,
      new Set<string>((props.roleIds ?? []).map((r) => r.toString())),
      'active',
    );

    membership.addDomainEvent(
      new MembershipGrantedEvent(
        membership.id.toString(),
        props.userId.toString(),
        props.companyId.toString(),
      ),
    );

    return membership;
  }

  static reconstitute(props: ReconstituteMembershipProps): MembershipAggregate {
    return new MembershipAggregate(
      props.id,
      props.userId,
      props.companyId,
      new Set<string>(props.roleIds),
      props.status,
    );
  }

  assignRole(roleId: RoleId): void {
    if (this.status === 'suspended') {
      throw new Error('Cannot assign role to a suspended membership');
    }
    const value = roleId.toString();
    if (this.roleIds.has(value)) {
      throw new Error('Role is already assigned to this membership');
    }
    this.roleIds.add(value);
    this.addDomainEvent(new MembershipRoleAssignedEvent(this.id.toString(), value));
  }

  revokeRole(roleId: RoleId): void {
    const value = roleId.toString();
    if (!this.roleIds.has(value)) {
      throw new Error('Role is not assigned to this membership');
    }
    this.roleIds.delete(value);
    this.addDomainEvent(new MembershipRoleRevokedEvent(this.id.toString(), value));
  }

  suspend(): void {
    if (this.status === 'suspended') {
      throw new Error('Membership is already suspended');
    }
    this.status = 'suspended';
    this.addDomainEvent(new MembershipSuspendedEvent(this.id.toString()));
  }

  getId(): MembershipId {
    return this.id;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getCompanyId(): CompanyId {
    return this.companyId;
  }

  getRoleIds(): string[] {
    return [...this.roleIds];
  }

  getStatus(): MembershipStatus {
    return this.status;
  }
}
