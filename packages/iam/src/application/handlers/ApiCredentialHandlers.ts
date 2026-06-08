import { randomBytes } from 'crypto';
import { ApiCredentialAggregate } from '../../domain/aggregates/ApiCredentialAggregate';
import { ApiKeyId } from '../../domain/value-objects/ApiKeyId';
import { ApiKeyPrefix } from '../../domain/value-objects/ApiKeyPrefix';
import { ApiKeySecretHash } from '../../domain/value-objects/ApiKeySecretHash';
import { CompanyId } from '../../domain/value-objects/CompanyId';
import {
  type IssueApiCredentialCommand,
  type IssuedApiKey,
  issueApiCredentialSchema,
  type RevokeApiCredentialCommand,
  type RotateApiCredentialCommand,
  revokeApiCredentialSchema,
  rotateApiCredentialSchema,
} from '../commands/ApiCredentialCommands';
import type { CommandHandler } from '../Handler';
import type { ApiKeySecretHasherPort } from '../ports/ApiKeySecretHasherPort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

const SECRET_BYTE_LENGTH = 32;

function generateRawSecret(): string {
  return randomBytes(SECRET_BYTE_LENGTH).toString('base64url');
}

export class IssueApiCredentialHandler
  implements CommandHandler<IssueApiCredentialCommand, IssuedApiKey>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly secretHasher: ApiKeySecretHasherPort,
  ) {}

  async execute(input: IssueApiCredentialCommand): Promise<IssuedApiKey> {
    const command = issueApiCredentialSchema.parse(input);
    const companyId = CompanyId.create(command.companyId);

    return this.uow.execute(async (ctx) => {
      let prefix = ApiKeyPrefix.generate();
      while (await ctx.apiCredentials.findByPrefix(prefix)) {
        prefix = ApiKeyPrefix.generate();
      }

      const rawSecret = generateRawSecret();
      const secretHash = ApiKeySecretHash.create(await this.secretHasher.hash(rawSecret));

      const credential = ApiCredentialAggregate.issue({
        companyId,
        name: command.name,
        prefix,
        secretHash,
      });

      await ctx.apiCredentials.save(credential);
      await ctx.outbox.enqueue(credential.getDomainEvents());
      credential.clearDomainEvents();

      return {
        apiKeyId: credential.getId().toString(),
        prefix: prefix.getValue(),
        apiKey: `${prefix.getValue()}.${rawSecret}`,
      };
    });
  }
}

export class RotateApiCredentialHandler
  implements CommandHandler<RotateApiCredentialCommand, IssuedApiKey>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly secretHasher: ApiKeySecretHasherPort,
  ) {}

  async execute(input: RotateApiCredentialCommand): Promise<IssuedApiKey> {
    const command = rotateApiCredentialSchema.parse(input);
    const apiKeyId = ApiKeyId.create(command.apiKeyId);

    return this.uow.execute(async (ctx) => {
      const credential = await ctx.apiCredentials.findById(apiKeyId);
      if (!credential) {
        throw new Error('API credential not found');
      }

      const rawSecret = generateRawSecret();
      const secretHash = ApiKeySecretHash.create(await this.secretHasher.hash(rawSecret));

      credential.rotate(secretHash);

      await ctx.apiCredentials.save(credential);
      await ctx.outbox.enqueue(credential.getDomainEvents());
      credential.clearDomainEvents();

      const prefix = credential.getPrefix().getValue();
      return {
        apiKeyId: credential.getId().toString(),
        prefix,
        apiKey: `${prefix}.${rawSecret}`,
      };
    });
  }
}

export class RevokeApiCredentialHandler implements CommandHandler<RevokeApiCredentialCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: RevokeApiCredentialCommand): Promise<void> {
    const command = revokeApiCredentialSchema.parse(input);
    const apiKeyId = ApiKeyId.create(command.apiKeyId);

    await this.uow.execute(async (ctx) => {
      const credential = await ctx.apiCredentials.findById(apiKeyId);
      if (!credential) {
        throw new Error('API credential not found');
      }

      credential.revoke();

      await ctx.apiCredentials.save(credential);
      await ctx.outbox.enqueue(credential.getDomainEvents());
      credential.clearDomainEvents();
    });
  }
}
