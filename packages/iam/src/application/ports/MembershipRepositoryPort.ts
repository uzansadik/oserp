import type { MembershipAggregate } from '../../domain/aggregates/MembershipAggregate';
import type { CompanyId } from '../../domain/value-objects/CompanyId';
import type { MembershipId } from '../../domain/value-objects/MembershipId';
import type { UserId } from '../../domain/value-objects/UserId';

export interface MembershipRepositoryPort {
  save(membership: MembershipAggregate): Promise<void>;

  findById(id: MembershipId): Promise<MembershipAggregate | null>;

  findByUserAndCompany(userId: UserId, companyId: CompanyId): Promise<MembershipAggregate | null>;

  findByUser(userId: UserId): Promise<MembershipAggregate[]>;
}
