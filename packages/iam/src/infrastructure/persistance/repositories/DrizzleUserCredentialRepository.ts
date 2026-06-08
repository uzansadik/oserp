import type { UserCredentialRepositoryPort } from '@oserp-community/iam/application/ports/UserCredentialRepositoryPort';
import type { UserCredential } from '@oserp-community/iam/domain/entities/UserCredential';
import type { UserId } from '@oserp-community/iam/domain/value-objects/UserId';
import { eq } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import {
  userCredentialToDomain,
  userCredentialToPersistence,
} from '../mappers/UserCredentialMapper';
import { iamUserCredentials } from '../schemas/iam.user-credential.schema';

export class DrizzleUserCredentialRepository implements UserCredentialRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(credential: UserCredential): Promise<void> {
    const data = userCredentialToPersistence(credential);
    await this.db
      .insert(iamUserCredentials)
      .values(data)
      .onConflictDoUpdate({
        target: iamUserCredentials.userId,
        set: {
          passwordHash: data.passwordHash,
          passwordUpdatedAt: data.passwordUpdatedAt,
          mustChangePassword: data.mustChangePassword,
        },
      });
  }

  async findByUserId(userId: UserId): Promise<UserCredential | null> {
    const row = await this.db.query.iamUserCredentials.findFirst({
      where: eq(iamUserCredentials.userId, userId.toString()),
    });
    return row ? userCredentialToDomain(row) : null;
  }
}
