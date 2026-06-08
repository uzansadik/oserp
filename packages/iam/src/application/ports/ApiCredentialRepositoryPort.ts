import type { ApiCredentialAggregate } from '../../domain/aggregates/ApiCredentialAggregate';
import type { ApiKeyId } from '../../domain/value-objects/ApiKeyId';
import type { ApiKeyPrefix } from '../../domain/value-objects/ApiKeyPrefix';
import type { CompanyId } from '../../domain/value-objects/CompanyId';

export interface ApiCredentialRepositoryPort {
  save(credential: ApiCredentialAggregate): Promise<void>;

  findById(id: ApiKeyId): Promise<ApiCredentialAggregate | null>;

  findByPrefix(prefix: ApiKeyPrefix): Promise<ApiCredentialAggregate | null>;

  findByCompany(companyId: CompanyId): Promise<ApiCredentialAggregate[]>;
}
