import { GrantMembershipHandler } from '@oserp-community/iam/application/handlers/MembershipHandlers';
import { CreatePermissionHandler } from '@oserp-community/iam/application/handlers/PermissionHandlers';
import {
  AssignPermissionToRoleHandler,
  CreateRoleHandler,
} from '@oserp-community/iam/application/handlers/RoleHandlers';
import { GetEffectivePermissionsHandler } from '@oserp-community/iam/application/handlers/RoleQueryHandlers';
import { RegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import { AuthorizationPolicy } from '@oserp-community/iam/application/policies/AuthorizationPolicy';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakePasswordHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

async function seed(
  grantedCodes: string[],
): Promise<{ policy: AuthorizationPolicy; userId: string }> {
  const uow = new InMemoryUnitOfWork();
  const hasher = new FakePasswordHasher();

  const { userId } = await new RegisterUserHandler(uow, hasher).execute({
    name: 'Ahmet',
    surname: 'Yilmaz',
    email: 'ahmet@example.com',
    username: 'ahmety',
    password: 'Abcdef12',
  });

  const { roleId } = await new CreateRoleHandler(uow).execute({
    name: 'manager',
    displayName: 'Manager',
    companyId: null,
    description: null,
  });

  for (const code of grantedCodes) {
    const [module, resource, action] = code.split('.');
    if (module && resource && action) {
      await new CreatePermissionHandler(uow).execute({ module, resource, action });
    }
    await new AssignPermissionToRoleHandler(uow).execute({ roleId, permissionCode: code });
  }

  await new GrantMembershipHandler(uow).execute({
    userId,
    companyId: COMPANY_ID,
    roleIds: [roleId],
  });

  const getEffective = new GetEffectivePermissionsHandler(uow.memberships, uow.roles);
  return { policy: new AuthorizationPolicy(getEffective), userId };
}

const ctx = (userId: string) => ({ userId, companyId: COMPANY_ID });

describe('AuthorizationPolicy', () => {
  let policy: AuthorizationPolicy;
  let userId: string;

  beforeEach(async () => {
    ({ policy, userId } = await seed(['catalog.product.read', 'catalog.product.update']));
  });

  it('sahip olunan izin icin can true doner', async () => {
    expect(await policy.can(ctx(userId), 'catalog.product.read')).toBe(true);
  });

  it('sahip olunmayan izin icin can false doner', async () => {
    expect(await policy.can(ctx(userId), 'catalog.product.delete')).toBe(false);
  });

  it('canAll tum izinler varsa true doner', async () => {
    expect(
      await policy.canAll(ctx(userId), ['catalog.product.read', 'catalog.product.update']),
    ).toBe(true);
  });

  it('canAll eksik izin varsa false doner', async () => {
    expect(
      await policy.canAll(ctx(userId), ['catalog.product.read', 'catalog.product.delete']),
    ).toBe(false);
  });

  it('canAny en az bir izin varsa true doner', async () => {
    expect(
      await policy.canAny(ctx(userId), ['catalog.product.delete', 'catalog.product.read']),
    ).toBe(true);
  });

  it('authorize izin yoksa ForbiddenError firlatir', async () => {
    await expect(policy.authorize(ctx(userId), 'catalog.product.delete')).rejects.toThrow(
      'Missing required permission',
    );
  });

  it('authorize izin varsa hata firlatmaz', async () => {
    await expect(policy.authorize(ctx(userId), 'catalog.product.read')).resolves.toBeUndefined();
  });

  it('authorizeAll eksik izinleri mesajda listeler', async () => {
    await expect(
      policy.authorizeAll(ctx(userId), ['catalog.product.read', 'catalog.product.delete']),
    ).rejects.toThrow('catalog.product.delete');
  });
});
