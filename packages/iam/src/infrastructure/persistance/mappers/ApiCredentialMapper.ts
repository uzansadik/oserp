import {
  ApiCredentialAggregate,
  type ApiCredentialStatus,
} from '@oserp-community/iam/domain/aggregates/ApiCredentialAggregate';
import { ApiKeyId } from '@oserp-community/iam/domain/value-objects/ApiKeyId';
import { ApiKeyPrefix } from '@oserp-community/iam/domain/value-objects/ApiKeyPrefix';
import { ApiKeySecretHash } from '@oserp-community/iam/domain/value-objects/ApiKeySecretHash';
import { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';

export type ApiCredentialPersistenceModel = {
  id: string;
  companyId: string;
  name: string;
  prefix: string;
  secretHash: string;
  status: string;
  createdAt: Date;
  lastRotatedAt: Date | null;
};

export function apiCredentialToPersistence(
  credential: ApiCredentialAggregate,
): ApiCredentialPersistenceModel {
  return {
    id: credential.getId().toString(),
    companyId: credential.getCompanyId().toString(),
    name: credential.getName(),
    prefix: credential.getPrefix().getValue(),
    secretHash: credential.getSecretHash().getValue(),
    status: credential.getStatus(),
    createdAt: credential.getCreatedAt(),
    lastRotatedAt: credential.getLastRotatedAt(),
  };
}

export function apiCredentialToDomain(row: ApiCredentialPersistenceModel): ApiCredentialAggregate {
  return ApiCredentialAggregate.reconstitute({
    id: ApiKeyId.create(row.id),
    companyId: CompanyId.create(row.companyId),
    name: row.name,
    prefix: ApiKeyPrefix.create(row.prefix),
    secretHash: ApiKeySecretHash.create(row.secretHash),
    status: row.status as ApiCredentialStatus,
    createdAt: row.createdAt,
    lastRotatedAt: row.lastRotatedAt,
  });
}
