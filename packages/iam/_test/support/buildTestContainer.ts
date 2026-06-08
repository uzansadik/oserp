import {
  IssueApiCredentialHandler,
  RevokeApiCredentialHandler,
  RotateApiCredentialHandler,
} from '@oserp-community/iam/application/handlers/ApiCredentialHandlers';
import {
  LoginHandler,
  LogoutHandler,
  RefreshSessionHandler,
} from '@oserp-community/iam/application/handlers/AuthHandlers';
import {
  AssignRoleToMemberHandler,
  GrantMembershipHandler,
  RevokeRoleFromMemberHandler,
  SuspendMembershipHandler,
} from '@oserp-community/iam/application/handlers/MembershipHandlers';
import { CreatePermissionHandler } from '@oserp-community/iam/application/handlers/PermissionHandlers';
import {
  AssignPermissionToRoleHandler,
  CreateRoleHandler,
  DeactivateRoleHandler,
  RenameRoleHandler,
  RevokePermissionFromRoleHandler,
} from '@oserp-community/iam/application/handlers/RoleHandlers';
import {
  GetEffectivePermissionsHandler,
  GetRoleByIdHandler,
  ListPermissionsHandler,
  ListRolesHandler,
} from '@oserp-community/iam/application/handlers/RoleQueryHandlers';
import {
  ChangePasswordHandler,
  ChangeUserStatusHandler,
  RegisterUserHandler,
  VerifyEmailHandler,
} from '@oserp-community/iam/application/handlers/UserHandlers';
import {
  GetUserByEmailHandler,
  GetUserByIdHandler,
  ListUsersHandler,
} from '@oserp-community/iam/application/handlers/UserQueryHandlers';
import { AuthorizationPolicy } from '@oserp-community/iam/application/policies/AuthorizationPolicy';
import type { IamContainer } from '../../src/container';
import { JwtTokenService } from '../../src/infrastructure/token/JwtTokenService';
import {
  FakeApiKeySecretHasher,
  FakePasswordHasher,
  FakeRefreshTokenHasher,
  FixedClock,
  InMemoryUnitOfWork,
} from './InMemoryUnitOfWork';

export const TEST_JWT_SECRET = 'integration-test-secret';

/**
 * Router entegrasyon testleri için in-memory bağımlılıklarla kurulmuş, gerçek
 * `IamContainer` şekline sahip kapsayıcı. Gerçek `JwtTokenService` kullanır
 * (authenticate akışının token doğrulayabilmesi için).
 */
export function buildTestContainer(): { container: IamContainer; uow: InMemoryUnitOfWork } {
  const uow = new InMemoryUnitOfWork();
  const passwordHasher = new FakePasswordHasher();
  const refreshTokenHasher = new FakeRefreshTokenHasher();
  const apiKeySecretHasher = new FakeApiKeySecretHasher();
  const tokenService = new JwtTokenService({ secret: TEST_JWT_SECRET });
  const clock = new FixedClock(new Date());

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
    login: new LoginHandler(uow, passwordHasher, refreshTokenHasher, tokenService, clock),
    refreshSession: new RefreshSessionHandler(uow, refreshTokenHasher, tokenService, clock),
    logout: new LogoutHandler(uow, refreshTokenHasher),
    issueApiCredential: new IssueApiCredentialHandler(uow, apiKeySecretHasher),
    rotateApiCredential: new RotateApiCredentialHandler(uow, apiKeySecretHasher),
    revokeApiCredential: new RevokeApiCredentialHandler(uow),
  };

  const getEffectivePermissions = new GetEffectivePermissionsHandler(uow.memberships, uow.roles);
  const queries = {
    getUserById: new GetUserByIdHandler(uow.users),
    getUserByEmail: new GetUserByEmailHandler(uow.users),
    listUsers: new ListUsersHandler(uow.users),
    getRoleById: new GetRoleByIdHandler(uow.roles),
    listRoles: new ListRolesHandler(uow.roles),
    listPermissions: new ListPermissionsHandler(uow.permissions),
    getEffectivePermissions,
  };

  const policies = {
    authorization: new AuthorizationPolicy(getEffectivePermissions),
  };

  const container = {
    adapters: { tokenService, passwordHasher, refreshTokenHasher, apiKeySecretHasher, clock },
    uow,
    repositories: {
      users: uow.users,
      roles: uow.roles,
      permissions: uow.permissions,
      memberships: uow.memberships,
    },
    commands,
    queries,
    policies,
  } as unknown as IamContainer;

  return { container, uow };
}
