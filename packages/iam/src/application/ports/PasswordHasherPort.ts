import type { PasswordHash } from '@oserp-community/iam/domain/value-objects/PasswordHash';

export interface PasswordHasherPort {
  hash(rawPassword: string): Promise<PasswordHash>;
  verify(rawPassword: string, passwordHash: PasswordHash): Promise<boolean>;
}
