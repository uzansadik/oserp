import type { ApiCredentialRepositoryPort } from '@oserp-community/iam/application/ports/ApiCredentialRepositoryPort';
import type { ApiKeySecretHasherPort } from '@oserp-community/iam/application/ports/ApiKeySecretHasherPort';
import type { ClockPort } from '@oserp-community/iam/application/ports/ClockPort';
import type { MembershipRepositoryPort } from '@oserp-community/iam/application/ports/MembershipRepositoryPort';
import type { OutboxPort } from '@oserp-community/iam/application/ports/OutboxPort';
import type { PasswordHasherPort } from '@oserp-community/iam/application/ports/PasswordHasherPort';
import type { PermissionRepositoryPort } from '@oserp-community/iam/application/ports/PermissionRepositoryPort';
import type { RefreshTokenHasherPort } from '@oserp-community/iam/application/ports/RefreshTokenHasherPort';
import type { RoleRepositoryPort } from '@oserp-community/iam/application/ports/RoleRepositoryPort';
import type { SessionRepositoryPort } from '@oserp-community/iam/application/ports/SessionRepositoryPort';
import type {
  AccessTokenClaims,
  TokenServicePort,
  VerifiedAccessToken,
} from '@oserp-community/iam/application/ports/TokenServicePort';
import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/iam/application/ports/UnitOfWorkPort';
import type { UserCredentialRepositoryPort } from '@oserp-community/iam/application/ports/UserCredentialRepositoryPort';
import type { UserRepositoryPort } from '@oserp-community/iam/application/ports/UserRepositoryPort';
import type { ApiCredentialAggregate } from '@oserp-community/iam/domain/aggregates/ApiCredentialAggregate';
import type { MembershipAggregate } from '@oserp-community/iam/domain/aggregates/MembershipAggregate';
import type { SessionAggregate } from '@oserp-community/iam/domain/aggregates/SessionAggregate';
import type { Permission } from '@oserp-community/iam/domain/entities/Permission';
import type { Role } from '@oserp-community/iam/domain/entities/Role';
import type { User } from '@oserp-community/iam/domain/entities/User';
import type { UserCredential } from '@oserp-community/iam/domain/entities/UserCredential';
import { PasswordHash } from '@oserp-community/iam/domain/value-objects/PasswordHash';
import type IDomainEvent from '@oserp-community/iam/interfaces/IDomainEvent';

export class FakePasswordHasher implements PasswordHasherPort {
  async hash(rawPassword: string): Promise<PasswordHash> {
    return PasswordHash.create(`$argon2id$v=19$m=65536,t=3,p=4$${rawPassword}`);
  }

  async verify(rawPassword: string, passwordHash: PasswordHash): Promise<boolean> {
    return passwordHash.getValue().endsWith(`$${rawPassword}`);
  }
}

class InMemoryUserRepository implements UserRepositoryPort {
  readonly store = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.store.set(user.id.toString(), user);
  }
  async findById(id: { toString(): string }): Promise<User | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByEmail(email: { value: string }): Promise<User | null> {
    return [...this.store.values()].find((u) => u.email.value === email.value) ?? null;
  }
  async findByUsername(username: { value: string }): Promise<User | null> {
    return [...this.store.values()].find((u) => u.userName.value === username.value) ?? null;
  }
  async existsByEmail(email: { value: string }): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }
  async existsByUsername(username: { value: string }): Promise<boolean> {
    return (await this.findByUsername(username)) !== null;
  }
  async count(): Promise<number> {
    return this.store.size;
  }
  async findAll(): Promise<User[]> {
    return [...this.store.values()];
  }
}

class InMemoryUserCredentialRepository implements UserCredentialRepositoryPort {
  readonly store = new Map<string, UserCredential>();

  async save(credential: UserCredential): Promise<void> {
    this.store.set(credential.getUserId().toString(), credential);
  }
  async findByUserId(userId: { toString(): string }): Promise<UserCredential | null> {
    return this.store.get(userId.toString()) ?? null;
  }
}

class InMemoryRoleRepository implements RoleRepositoryPort {
  readonly store = new Map<string, Role>();

  async save(role: Role): Promise<void> {
    this.store.set(role.getId().toString(), role);
  }
  async findById(id: { toString(): string }): Promise<Role | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findManyByIds(ids: { toString(): string }[]): Promise<Role[]> {
    return ids.map((id) => this.store.get(id.toString())).filter((r): r is Role => r != null);
  }
  async findByCompany(companyId: { toString(): string } | null): Promise<Role[]> {
    const key = companyId ? companyId.toString() : null;
    return [...this.store.values()].filter((r) => {
      const c = r.getCompanyId();
      return (c ? c.toString() : null) === key;
    });
  }
  async existsByName(
    name: { value: string },
    companyId: { toString(): string } | null,
  ): Promise<boolean> {
    const roles = await this.findByCompany(companyId);
    return roles.some((r) => r.getName().value === name.value);
  }
}

class InMemoryPermissionRepository implements PermissionRepositoryPort {
  readonly store = new Map<string, Permission>();
  readonly codes = new Set<string>();

  async save(permission: Permission): Promise<void> {
    this.store.set(permission.getId().toString(), permission);
    this.codes.add(permission.getCode().getValue());
  }
  async findById(id: { toString(): string }): Promise<Permission | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByCode(code: { getValue(): string }): Promise<Permission | null> {
    return [...this.store.values()].find((p) => p.getCode().getValue() === code.getValue()) ?? null;
  }
  async existsByCode(code: { getValue(): string }): Promise<boolean> {
    return this.codes.has(code.getValue());
  }
  async findAll(): Promise<Permission[]> {
    return [...this.store.values()];
  }
}

class InMemoryMembershipRepository implements MembershipRepositoryPort {
  readonly store = new Map<string, MembershipAggregate>();

  async save(membership: MembershipAggregate): Promise<void> {
    this.store.set(membership.getId().toString(), membership);
  }
  async findById(id: { toString(): string }): Promise<MembershipAggregate | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByUserAndCompany(
    userId: { toString(): string },
    companyId: { toString(): string },
  ): Promise<MembershipAggregate | null> {
    return (
      [...this.store.values()].find(
        (m) =>
          m.getUserId().toString() === userId.toString() &&
          m.getCompanyId().toString() === companyId.toString(),
      ) ?? null
    );
  }
  async findByUser(userId: { toString(): string }): Promise<MembershipAggregate[]> {
    return [...this.store.values()].filter((m) => m.getUserId().toString() === userId.toString());
  }
}

class InMemorySessionRepository implements SessionRepositoryPort {
  readonly store = new Map<string, SessionAggregate>();

  async save(session: SessionAggregate): Promise<void> {
    this.store.set(session.getId().toString(), session);
  }
  async findById(id: { toString(): string }): Promise<SessionAggregate | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionAggregate | null> {
    return (
      [...this.store.values()].find((s) => s.getRefreshTokenHash() === refreshTokenHash) ?? null
    );
  }
  async findActiveByUser(userId: { toString(): string }): Promise<SessionAggregate[]> {
    return [...this.store.values()].filter(
      (s) => s.getUserId().toString() === userId.toString() && s.isActive(),
    );
  }
}

class InMemoryApiCredentialRepository implements ApiCredentialRepositoryPort {
  readonly store = new Map<string, ApiCredentialAggregate>();

  async save(credential: ApiCredentialAggregate): Promise<void> {
    this.store.set(credential.getId().toString(), credential);
  }
  async findById(id: { toString(): string }): Promise<ApiCredentialAggregate | null> {
    return this.store.get(id.toString()) ?? null;
  }
  async findByPrefix(prefix: { getValue(): string }): Promise<ApiCredentialAggregate | null> {
    return (
      [...this.store.values()].find((c) => c.getPrefix().getValue() === prefix.getValue()) ?? null
    );
  }
  async findByCompany(companyId: { toString(): string }): Promise<ApiCredentialAggregate[]> {
    return [...this.store.values()].filter(
      (c) => c.getCompanyId().toString() === companyId.toString(),
    );
  }
}

export class InMemoryOutbox implements OutboxPort {
  readonly events: IDomainEvent[] = [];

  async enqueue(events: IDomainEvent[]): Promise<void> {
    this.events.push(...events);
  }
}

export class InMemoryUnitOfWork implements UnitOfWorkPort {
  readonly users = new InMemoryUserRepository();
  readonly userCredentials = new InMemoryUserCredentialRepository();
  readonly roles = new InMemoryRoleRepository();
  readonly permissions = new InMemoryPermissionRepository();
  readonly memberships = new InMemoryMembershipRepository();
  readonly sessions = new InMemorySessionRepository();
  readonly apiCredentials = new InMemoryApiCredentialRepository();
  readonly outbox = new InMemoryOutbox();

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return work(this);
  }
}

/** Deterministik refresh-token hash'leyici (lookup'un çalışabilmesi için). */
export class FakeRefreshTokenHasher implements RefreshTokenHasherPort {
  async hash(rawToken: string): Promise<string> {
    return `hashed:${rawToken}`;
  }
  async verify(rawToken: string, tokenHash: string): Promise<boolean> {
    return tokenHash === `hashed:${rawToken}`;
  }
}

export class FakeTokenService implements TokenServicePort {
  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return `access:${claims.sub}`;
  }
  async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    const sub = token.replace(/^access:/, '');
    return { sub, companyId: null, permissions: [], expiresAt: new Date(Date.now() + 900_000) };
  }
}

export class FakeApiKeySecretHasher implements ApiKeySecretHasherPort {
  async hash(rawSecret: string): Promise<string> {
    return `secret:${rawSecret}`;
  }
  async verify(rawSecret: string, secretHash: string): Promise<boolean> {
    return secretHash === `secret:${rawSecret}`;
  }
}

/** Kontrol edilebilir saat. */
export class FixedClock implements ClockPort {
  constructor(private current: Date = new Date()) {}
  now(): Date {
    return this.current;
  }
  set(date: Date): void {
    this.current = date;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
