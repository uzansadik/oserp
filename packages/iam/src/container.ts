import {
  IssueApiCredentialHandler,
  RevokeApiCredentialHandler,
  RotateApiCredentialHandler,
} from './application/handlers/ApiCredentialHandlers';
import {
  LoginHandler,
  LogoutHandler,
  RefreshSessionHandler,
} from './application/handlers/AuthHandlers';
import {
  AssignRoleToMemberHandler,
  GrantMembershipHandler,
  RevokeRoleFromMemberHandler,
  SuspendMembershipHandler,
} from './application/handlers/MembershipHandlers';
import { CreatePermissionHandler } from './application/handlers/PermissionHandlers';
import {
  AssignPermissionToRoleHandler,
  CreateRoleHandler,
  DeactivateRoleHandler,
  RenameRoleHandler,
  RevokePermissionFromRoleHandler,
} from './application/handlers/RoleHandlers';
import {
  GetEffectivePermissionsHandler,
  GetRoleByIdHandler,
  ListPermissionsHandler,
  ListRolesHandler,
} from './application/handlers/RoleQueryHandlers';
import {
  ChangePasswordHandler,
  ChangeUserStatusHandler,
  RegisterUserHandler,
  VerifyEmailHandler,
} from './application/handlers/UserHandlers';
import {
  GetUserByEmailHandler,
  GetUserByIdHandler,
  ListUsersHandler,
} from './application/handlers/UserQueryHandlers';
import { AuthorizationPolicy } from './application/policies/AuthorizationPolicy';
import type { ClockPort } from './application/ports/ClockPort';
import type { EmailSenderPort } from './application/ports/EmailSenderPort';
import type { EventBusPort } from './application/ports/EventBusPort';
import type { PasswordHasherPort } from './application/ports/PasswordHasherPort';
import type { UuidPort } from './application/ports/UuidPort';
import { SystemClock } from './infrastructure/clock/SystemClock';
import { CryptoUuidGenerator } from './infrastructure/crypto/CryptoUuidGenerator';
import { Sha256ApiKeySecretHasher } from './infrastructure/crypto/Sha256ApiKeySecretHasher';
import { ConsoleEmailAdapter } from './infrastructure/email/ConsoleEmailAdapter';
import { InMemoryEventBus } from './infrastructure/event-store/InMemoryEventBus';
import { OutboxPublisher } from './infrastructure/event-store/OutboxPublisher';
import { Argon2PasswordHasherAdapter } from './infrastructure/password/Argon2PasswordHasherAdapter';
import { DrizzleUnitOfWork } from './infrastructure/persistance/DrizzleUnitOfWork';
import type { IamDb } from './infrastructure/persistance/db';
import { DrizzleMembershipRepository } from './infrastructure/persistance/repositories/DrizzleMembershipRepository';
import { DrizzlePermissionRepository } from './infrastructure/persistance/repositories/DrizzlePermissionRepository';
import { DrizzleRoleRepository } from './infrastructure/persistance/repositories/DrizzleRoleRepository';
import { DrizzleUserRepository } from './infrastructure/persistance/repositories/DrizzleUserRepository';
import { JwtTokenService } from './infrastructure/token/JwtTokenService';
import { Sha256RefreshTokenHasher } from './infrastructure/token/Sha256RefreshTokenHasher';

export type IamContainerConfig = {
  /** Drizzle veritabanı bağlantısı. */
  db: IamDb;
  /** Access token (JWT HS256) imzalama anahtarı. */
  jwtSecret: string;
  /** Access token TTL (saniye). Varsayılan 15 dk. */
  accessTokenTtlSeconds?: number;
  /** JWT issuer (`iss`). */
  jwtIssuer?: string;
  /** Refresh token TTL (ms). Varsayılan 30 gün. */
  refreshTokenTtlMs?: number;
  /** İsteğe bağlı port override'ları (test/özelleştirme için). */
  overrides?: Partial<{
    passwordHasher: PasswordHasherPort;
    clock: ClockPort;
    uuid: UuidPort;
    eventBus: EventBusPort;
    emailSender: EmailSenderPort;
  }>;
};

/**
 * IAM bağlamının composition root'u. Port'ları somut adapter'lara bağlar ve
 * tüm command/query handler'larını, policy'leri ve altyapı servislerini hazır
 * nesneler olarak sunar. `apps/api` ve interface katmanı bu nesneyi tüketir.
 */
export function createIamContainer(config: IamContainerConfig) {
  const { db, overrides = {} } = config;

  // --- Altyapı adapter'ları (port -> adapter) ---
  const clock = overrides.clock ?? new SystemClock();
  const uuid = overrides.uuid ?? new CryptoUuidGenerator();
  const passwordHasher = overrides.passwordHasher ?? new Argon2PasswordHasherAdapter();
  const refreshTokenHasher = new Sha256RefreshTokenHasher();
  const apiKeySecretHasher = new Sha256ApiKeySecretHasher();
  const tokenService = new JwtTokenService({
    secret: config.jwtSecret,
    ...(config.accessTokenTtlSeconds !== undefined
      ? { accessTokenTtlSeconds: config.accessTokenTtlSeconds }
      : {}),
    ...(config.jwtIssuer !== undefined ? { issuer: config.jwtIssuer } : {}),
  });
  const eventBus = overrides.eventBus ?? new InMemoryEventBus();
  const emailSender = overrides.emailSender ?? new ConsoleEmailAdapter();
  const outboxPublisher = new OutboxPublisher(db, eventBus);

  // --- Unit of Work (yazma yolu) ---
  const uow = new DrizzleUnitOfWork(db);

  // --- Salt-okuma repository'leri (query yolu) ---
  const users = new DrizzleUserRepository(db);
  const roles = new DrizzleRoleRepository(db);
  const permissions = new DrizzlePermissionRepository(db);
  const memberships = new DrizzleMembershipRepository(db);

  // --- Query handler'lar (önce oluşturulmalı; command handler'lar kullanıyor) ---
  const getEffectivePermissions = new GetEffectivePermissionsHandler(memberships, roles);

  const authConfig =
    config.refreshTokenTtlMs !== undefined ? { refreshTokenTtlMs: config.refreshTokenTtlMs } : {};

  // --- Command handler'lar ---
  const commands = {
    registerUser: new RegisterUserHandler(uow, passwordHasher),
    changePassword: new ChangePasswordHandler(uow, passwordHasher),
    verifyEmail: new VerifyEmailHandler(uow),
    changeUserStatus: new ChangeUserStatusHandler(uow),

    createRole: new CreateRoleHandler(uow),
    renameRole: new RenameRoleHandler(uow),
    assignPermissionToRole: new AssignPermissionToRoleHandler(uow),
    revokePermissionFromRole: new RevokePermissionFromRoleHandler(uow),
    deactivateRole: new DeactivateRoleHandler(uow),

    createPermission: new CreatePermissionHandler(uow),

    grantMembership: new GrantMembershipHandler(uow),
    assignRoleToMember: new AssignRoleToMemberHandler(uow),
    revokeRoleFromMember: new RevokeRoleFromMemberHandler(uow),
    suspendMembership: new SuspendMembershipHandler(uow),

    login: new LoginHandler(
      uow,
      passwordHasher,
      refreshTokenHasher,
      tokenService,
      clock,
      getEffectivePermissions,
      authConfig,
    ),
    refreshSession: new RefreshSessionHandler(
      uow,
      refreshTokenHasher,
      tokenService,
      clock,
      getEffectivePermissions,
      authConfig,
    ),
    logout: new LogoutHandler(uow, refreshTokenHasher),

    issueApiCredential: new IssueApiCredentialHandler(uow, apiKeySecretHasher),
    rotateApiCredential: new RotateApiCredentialHandler(uow, apiKeySecretHasher),
    revokeApiCredential: new RevokeApiCredentialHandler(uow),
  } as const;

  // --- Query handler'lar (queries objesi) ---
  const queries = {
    getUserById: new GetUserByIdHandler(users),
    getUserByEmail: new GetUserByEmailHandler(users),
    listUsers: new ListUsersHandler(users),

    getRoleById: new GetRoleByIdHandler(roles),
    listRoles: new ListRolesHandler(roles),
    listPermissions: new ListPermissionsHandler(permissions),
    getEffectivePermissions,
  } as const;

  // --- Policy'ler ---
  const policies = {
    authorization: new AuthorizationPolicy(getEffectivePermissions),
  } as const;

  return {
    config,
    adapters: {
      clock,
      uuid,
      passwordHasher,
      refreshTokenHasher,
      apiKeySecretHasher,
      tokenService,
      eventBus,
      emailSender,
      outboxPublisher,
    },
    uow,
    repositories: { users, roles, permissions, memberships },
    commands,
    queries,
    policies,
  };
}

export type IamContainer = ReturnType<typeof createIamContainer>;
