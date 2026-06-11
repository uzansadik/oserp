import type { User } from '../../domain/entities/User';
import type { Email } from '../../domain/value-objects/Email';
import type { UserId } from '../../domain/value-objects/UserId';
import type { Username } from '../../domain/value-objects/Username';

export interface UserRepositoryPort {
  save(user: User): Promise<void>;

  findById(id: UserId): Promise<User | null>;

  findByEmail(email: Email): Promise<User | null>;

  findByUsername(username: Username): Promise<User | null>;

  existsByEmail(email: Email): Promise<boolean>;

  existsByUsername(username: Username): Promise<boolean>;

  /**
   * DB'deki kullanici sayisi. Bootstrap guard'i icin kullanilir: sadece
   * count() === 0 iken ilk sistem kullanicisi seed edilebilir.
   */
  count(): Promise<number>;

  findAll(): Promise<User[]>;
}
