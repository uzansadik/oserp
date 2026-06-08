import { UserCredential } from '@oserp-community/iam/domain/entities/UserCredential';
import { PasswordHash } from '@oserp-community/iam/domain/value-objects/PasswordHash';
import { UserId } from '@oserp-community/iam/domain/value-objects/UserId';

export type UserCredentialPersistenceModel = {
  userId: string;
  passwordHash: string;
  passwordUpdatedAt: Date;
  mustChangePassword: boolean;
};

export function userCredentialToPersistence(
  credential: UserCredential,
): UserCredentialPersistenceModel {
  return {
    userId: credential.getUserId().toString(),
    passwordHash: credential.getHash().getValue(),
    passwordUpdatedAt: credential.getPasswordUpdatedAt(),
    mustChangePassword: credential.getMustChangePassword(),
  };
}

export function userCredentialToDomain(row: UserCredentialPersistenceModel): UserCredential {
  return new UserCredential(
    UserId.create(row.userId),
    PasswordHash.create(row.passwordHash),
    row.passwordUpdatedAt,
    row.mustChangePassword,
  );
}
