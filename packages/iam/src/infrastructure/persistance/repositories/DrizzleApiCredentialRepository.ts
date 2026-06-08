import type { ApiCredentialRepositoryPort } from '@oserp-community/iam/application/ports/ApiCredentialRepositoryPort';
import type { ApiCredentialAggregate } from '@oserp-community/iam/domain/aggregates/ApiCredentialAggregate';
import type { ApiKeyId } from '@oserp-community/iam/domain/value-objects/ApiKeyId';
import type { ApiKeyPrefix } from '@oserp-community/iam/domain/value-objects/ApiKeyPrefix';
import type { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import { eq } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { apiCredentialToDomain, apiCredentialToPersistence } from '../mappers/ApiCredentialMapper';
import { iamApiCredentials } from '../schemas/iam.api-credential.schema';

export class DrizzleApiCredentialRepository implements ApiCredentialRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(credential: ApiCredentialAggregate): Promise<void> {
    const data = apiCredentialToPersistence(credential);
    await this.db
      .insert(iamApiCredentials)
      .values(data)
      .onConflictDoUpdate({
        target: iamApiCredentials.id,
        set: {
          name: data.name,
          secretHash: data.secretHash,
          status: data.status,
          lastRotatedAt: data.lastRotatedAt,
        },
      });
  }

  async findById(id: ApiKeyId): Promise<ApiCredentialAggregate | null> {
    const row = await this.db.query.iamApiCredentials.findFirst({
      where: eq(iamApiCredentials.id, id.toString()),
    });
    return row ? apiCredentialToDomain(row) : null;
  }

  async findByPrefix(prefix: ApiKeyPrefix): Promise<ApiCredentialAggregate | null> {
    const row = await this.db.query.iamApiCredentials.findFirst({
      where: eq(iamApiCredentials.prefix, prefix.getValue()),
    });
    return row ? apiCredentialToDomain(row) : null;
  }

  async findByCompany(companyId: CompanyId): Promise<ApiCredentialAggregate[]> {
    const rows = await this.db.query.iamApiCredentials.findMany({
      where: eq(iamApiCredentials.companyId, companyId.toString()),
    });
    return rows.map(apiCredentialToDomain);
  }
}
