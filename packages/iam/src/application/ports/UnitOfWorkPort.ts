import type { ApiCredentialRepositoryPort } from './ApiCredentialRepositoryPort';
import type { MembershipRepositoryPort } from './MembershipRepositoryPort';
import type { OutboxPort } from './OutboxPort';
import type { PermissionRepositoryPort } from './PermissionRepositoryPort';
import type { RoleRepositoryPort } from './RoleRepositoryPort';
import type { SessionRepositoryPort } from './SessionRepositoryPort';
import type { UserCredentialRepositoryPort } from './UserCredentialRepositoryPort';
import type { UserRepositoryPort } from './UserRepositoryPort';

/**
 * Tek bir transaction kapsamında erişilen repository'ler ve outbox.
 * Handler'lar bu bağlam üzerinden çalışır; aggregate kaydı ile event'lerin
 * outbox'a yazılması atomik olur.
 */
export interface UnitOfWorkContext {
  readonly users: UserRepositoryPort;
  readonly userCredentials: UserCredentialRepositoryPort;
  readonly roles: RoleRepositoryPort;
  readonly permissions: PermissionRepositoryPort;
  readonly memberships: MembershipRepositoryPort;
  readonly sessions: SessionRepositoryPort;
  readonly apiCredentials: ApiCredentialRepositoryPort;
  readonly outbox: OutboxPort;
}

export interface UnitOfWorkPort {
  /**
   * Verilen işi tek bir veritabanı transaction'ında çalıştırır.
   * `work` başarıyla dönerse commit, hata fırlatırsa rollback yapılır.
   */
  execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}
