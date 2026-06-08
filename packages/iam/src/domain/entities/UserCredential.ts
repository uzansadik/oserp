import type { UserId } from '../value-objects';
import type { PasswordHash } from '../value-objects/PasswordHash';

export class UserCredential {
  constructor(
    private readonly userId: UserId,
    private passwordHash: PasswordHash,
    private passwordUpdatedAt: Date,
    private mustChangePassword: boolean,
  ) {}

  changePassword(newHash: PasswordHash) {
    this.passwordHash = newHash;
    this.passwordUpdatedAt = new Date();
    this.mustChangePassword = false;
  }

  requirePasswordChange() {
    this.mustChangePassword = true;
  }

  getUserId(): UserId {
    return this.userId;
  }

  getHash(): PasswordHash {
    return this.passwordHash;
  }

  getPasswordUpdatedAt(): Date {
    return this.passwordUpdatedAt;
  }

  getMustChangePassword(): boolean {
    return this.mustChangePassword;
  }
}
