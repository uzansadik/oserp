import type { MembershipRepositoryPort } from '@oserp-community/iam/application/ports/MembershipRepositoryPort';
import type { MembershipAggregate } from '@oserp-community/iam/domain/aggregates/MembershipAggregate';
import type { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import type { MembershipId } from '@oserp-community/iam/domain/value-objects/MembershipId';
import type { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import { and, eq, inArray } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { membershipToDomain, membershipToPersistence } from '../mappers/MembershipMapper';
import { iamMembershipRoles, iamMemberships } from '../schemas/iam.membership.schema';

export class DrizzleMembershipRepository implements MembershipRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(membership: MembershipAggregate): Promise<void> {
    const data = membershipToPersistence(membership);
    await this.db
      .insert(iamMemberships)
      .values(data)
      .onConflictDoUpdate({
        target: iamMemberships.id,
        set: {
          status: data.status,
          updatedAt: new Date(),
        },
      });

    await this.db.delete(iamMembershipRoles).where(eq(iamMembershipRoles.membershipId, data.id));

    const roleIds = membership.getRoleIds();
    if (roleIds.length > 0) {
      await this.db
        .insert(iamMembershipRoles)
        .values(roleIds.map((roleId) => ({ membershipId: data.id, roleId })));
    }
  }

  async findById(id: MembershipId): Promise<MembershipAggregate | null> {
    const row = await this.db.query.iamMemberships.findFirst({
      where: eq(iamMemberships.id, id.toString()),
    });
    if (!row) return null;
    return membershipToDomain(row, await this.loadRoleIds(row.id));
  }

  async findByUserAndCompany(
    userId: UserId,
    companyId: CompanyId,
  ): Promise<MembershipAggregate | null> {
    const row = await this.db.query.iamMemberships.findFirst({
      where: and(
        eq(iamMemberships.userId, userId.toString()),
        eq(iamMemberships.companyId, companyId.toString()),
      ),
    });
    if (!row) return null;
    return membershipToDomain(row, await this.loadRoleIds(row.id));
  }

  async findByUser(userId: UserId): Promise<MembershipAggregate[]> {
    const rows = await this.db.query.iamMemberships.findMany({
      where: eq(iamMemberships.userId, userId.toString()),
    });
    return Promise.all(
      rows.map(async (row) => membershipToDomain(row, await this.loadRoleIds(row.id))),
    );
  }

  private async loadRoleIds(membershipId: string): Promise<string[]> {
    const rows = await this.db.query.iamMembershipRoles.findMany({
      where: inArray(iamMembershipRoles.membershipId, [membershipId]),
    });
    return rows.map((row) => row.roleId);
  }
}
