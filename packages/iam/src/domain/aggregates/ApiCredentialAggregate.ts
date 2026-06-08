import { ApiCredentialIssuedEvent } from '@oserp-community/iam/domain/events/ApiCredentialIssuedEvent';
import { ApiCredentialRevokedEvent } from '@oserp-community/iam/domain/events/ApiCredentialRevokedEvent';
import { ApiCredentialRotatedEvent } from '@oserp-community/iam/domain/events/ApiCredentialRotatedEvent';
import { AggregateRoot } from '../entities/AggregateRoot';
import { ApiKeyId } from '../value-objects/ApiKeyId';
import type { ApiKeyPrefix } from '../value-objects/ApiKeyPrefix';
import type { ApiKeySecretHash } from '../value-objects/ApiKeySecretHash';
import type { CompanyId } from '../value-objects/CompanyId';

export type ApiCredentialStatus = 'active' | 'revoked';

export type IssueApiCredentialProps = {
  companyId: CompanyId;
  name: string;
  prefix: ApiKeyPrefix;
  secretHash: ApiKeySecretHash;
};

export type ReconstituteApiCredentialProps = {
  id: ApiKeyId;
  companyId: CompanyId;
  name: string;
  prefix: ApiKeyPrefix;
  secretHash: ApiKeySecretHash;
  status: ApiCredentialStatus;
  createdAt: Date;
  lastRotatedAt: Date | null;
};

export class ApiCredentialAggregate extends AggregateRoot {
  private constructor(
    private readonly id: ApiKeyId,
    private readonly companyId: CompanyId,
    private readonly name: string,
    private readonly prefix: ApiKeyPrefix,
    private secretHash: ApiKeySecretHash,
    private status: ApiCredentialStatus,
    private readonly createdAt: Date,
    private lastRotatedAt: Date | null,
  ) {
    super();
  }

  static issue(props: IssueApiCredentialProps): ApiCredentialAggregate {
    if (!props.name || props.name.trim() === '') {
      throw new Error('API credential name cannot be empty');
    }

    const credential = new ApiCredentialAggregate(
      ApiKeyId.generate(),
      props.companyId,
      props.name.trim(),
      props.prefix,
      props.secretHash,
      'active',
      new Date(),
      null,
    );

    credential.addDomainEvent(
      new ApiCredentialIssuedEvent(
        credential.id.toString(),
        props.companyId.toString(),
        props.prefix.getValue(),
      ),
    );

    return credential;
  }

  static reconstitute(props: ReconstituteApiCredentialProps): ApiCredentialAggregate {
    return new ApiCredentialAggregate(
      props.id,
      props.companyId,
      props.name,
      props.prefix,
      props.secretHash,
      props.status,
      props.createdAt,
      props.lastRotatedAt,
    );
  }

  rotate(newSecretHash: ApiKeySecretHash, now: Date = new Date()): void {
    if (this.status === 'revoked') {
      throw new Error('Cannot rotate a revoked API credential');
    }
    this.secretHash = newSecretHash;
    this.lastRotatedAt = now;
    this.addDomainEvent(new ApiCredentialRotatedEvent(this.id.toString()));
  }

  revoke(): void {
    if (this.status === 'revoked') {
      throw new Error('API credential is already revoked');
    }
    this.status = 'revoked';
    this.addDomainEvent(new ApiCredentialRevokedEvent(this.id.toString()));
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  getId(): ApiKeyId {
    return this.id;
  }

  getCompanyId(): CompanyId {
    return this.companyId;
  }

  getName(): string {
    return this.name;
  }

  getPrefix(): ApiKeyPrefix {
    return this.prefix;
  }

  getSecretHash(): ApiKeySecretHash {
    return this.secretHash;
  }

  getStatus(): ApiCredentialStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastRotatedAt(): Date | null {
    return this.lastRotatedAt;
  }
}
