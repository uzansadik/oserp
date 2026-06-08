import type { UserCredential } from '../../domain/entities/UserCredential';
import type { UserId } from '../../domain/value-objects/UserId';

export interface UserCredentialRepositoryPort {
  save(credential: UserCredential): Promise<void>;

  findByUserId(userId: UserId): Promise<UserCredential | null>;
}
