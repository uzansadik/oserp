import {
  MembershipAggregate,
  type MembershipStatus,
} from '@oserp-community/iam/domain/aggregates/MembershipAggregate';
import { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import { MembershipId } from '@oserp-community/iam/domain/value-objects/MembershipId';
import { UserId } from '@oserp-community/iam/domain/value-objects/UserId';

export type MembershipPersistenceModel = {
  id: string;
  userId: string;
  companyId: string;
  status: string;
};

export function membershipToPersistence(
  membership: MembershipAggregate,
): MembershipPersistenceModel {
  return {
    id: membership.getId().toString(),
    userId: membership.getUserId().toString(),
    companyId: membership.getCompanyId().toString(),
    status: membership.getStatus(),
  };
}

export function membershipToDomain(
  row: MembershipPersistenceModel,
  roleIds: string[],
): MembershipAggregate {
  return MembershipAggregate.reconstitute({
    id: MembershipId.create(row.id),
    userId: UserId.create(row.userId),
    companyId: CompanyId.create(row.companyId),
    roleIds,
    status: row.status as MembershipStatus,
  });
}
