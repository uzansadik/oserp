import type { PasswordHasherPort } from '@oserp-community/iam/application/ports/PasswordHasherPort';
import { PasswordHash } from '@oserp-community/iam/domain/value-objects/PasswordHash';
import argon2 from 'argon2';

export class Argon2PasswordHasherAdapter implements PasswordHasherPort {
  async hash(rawPassword: string): Promise<PasswordHash> {
    const hashed = await argon2.hash(rawPassword, {
      type: argon2.argon2id,
    });

    return PasswordHash.create(hashed);
  }

  async verify(rawPassword: string, passwordHash: PasswordHash): Promise<boolean> {
    return argon2.verify(passwordHash.getValue(), rawPassword);
  }
}
