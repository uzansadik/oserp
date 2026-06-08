import { GrantMembershipHandler } from '@oserp-community/iam/application/handlers/MembershipHandlers';
import { CreatePermissionHandler } from '@oserp-community/iam/application/handlers/PermissionHandlers';
import {
  AssignPermissionToRoleHandler,
  CreateRoleHandler,
} from '@oserp-community/iam/application/handlers/RoleHandlers';
import {
  GetEffectivePermissionsHandler,
  GetRoleByIdHandler,
  ListPermissionsHandler,
  ListRolesHandler,
} from '@oserp-community/iam/application/handlers/RoleQueryHandlers';
import { RegisterUserHandler } from '@oserp-community/iam/application/handlers/UserHandlers';
import { beforeEach, describe, expect, it } from 'vitest';
import { FakePasswordHasher, InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

describe('Role query handlers', () => {
  let uow: InMemoryUnitOfWork;
  let roleId: string;

  beforeEach(async () => {
    uow = new InMemoryUnitOfWork();
    const created = await new CreateRoleHandler(uow).execute({
      name: 'manager',
      displayName: 'Manager',
      companyId: null,
      description: 'Yonetici rolu',
    });
    roleId = created.roleId;
  });

  it('GetRoleById rolu doner', async () => {
    const view = await new GetRoleByIdHandler(uow.roles).execute({ roleId });
    expect(view).not.toBeNull();
    expect(view!.name).toBe('manager');
    expect(view!.displayName).toBe('Manager');
    expect(view!.description).toBe('Yonetici rolu');
  });

  it('ListRoles sistem rollerini doner', async () => {
    const views = await new ListRolesHandler(uow.roles).execute({ companyId: null });
    expect(views).toHaveLength(1);
  });

  it('ListPermissions tum izinleri doner', async () => {
    await new CreatePermissionHandler(uow).execute({
      module: 'catalog',
      resource: 'product',
      action: 'read',
    });
    const views = await new ListPermissionsHandler(uow.permissions).execute({});
    expect(views).toHaveLength(1);
    expect(views[0]!.code).toBe('catalog.product.read');
  });
});

describe('GetEffectivePermissionsHandler', () => {
  it('uyenin rolleri uzerinden izin kodlarini birlestirir', async () => {
    const uow = new InMemoryUnitOfWork();
    const hasher = new FakePasswordHasher();

    const { userId } = await new RegisterUserHandler(uow, hasher).execute({
      name: 'Ahmet',
      surname: 'Yilmaz',
      email: 'ahmet@example.com',
      username: 'ahmety',
      password: 'Abcdef12',
    });

    await new CreatePermissionHandler(uow).execute({
      module: 'catalog',
      resource: 'product',
      action: 'read',
    });
    const { roleId } = await new CreateRoleHandler(uow).execute({
      name: 'manager',
      displayName: 'Manager',
      companyId: null,
      description: null,
    });
    await new AssignPermissionToRoleHandler(uow).execute({
      roleId,
      permissionCode: 'catalog.product.read',
    });
    await new GrantMembershipHandler(uow).execute({
      userId,
      companyId: COMPANY_ID,
      roleIds: [roleId],
    });

    const view = await new GetEffectivePermissionsHandler(uow.memberships, uow.roles).execute({
      userId,
      companyId: COMPANY_ID,
    });

    expect(view.permissionCodes).toEqual(['catalog.product.read']);
  });

  it('uyelik yoksa bos liste doner', async () => {
    const uow = new InMemoryUnitOfWork();
    const view = await new GetEffectivePermissionsHandler(uow.memberships, uow.roles).execute({
      userId: '33333333-3333-4333-8333-333333333333',
      companyId: COMPANY_ID,
    });
    expect(view.permissionCodes).toEqual([]);
  });
});
