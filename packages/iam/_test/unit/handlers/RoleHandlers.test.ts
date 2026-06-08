import {
  AssignPermissionToRoleHandler,
  CreateRoleHandler,
  DeactivateRoleHandler,
  RenameRoleHandler,
} from '@oserp-community/iam/application/handlers/RoleHandlers';
import { Permission } from '@oserp-community/iam/domain/entities/Permission';
import { RoleCreatedEvent } from '@oserp-community/iam/domain/events/RoleCreatedEvent';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

describe('CreateRoleHandler', () => {
  let uow: InMemoryUnitOfWork;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
  });

  const command = {
    name: 'manager',
    displayName: 'Manager',
    companyId: null,
    description: null,
  };

  it('rol olusturur ve RoleCreatedEvent uretir', async () => {
    const { roleId } = await new CreateRoleHandler(uow).execute(command);

    expect(uow.roles.store.has(roleId)).toBe(true);
    expect(uow.outbox.events[0]).toBeInstanceOf(RoleCreatedEvent);
  });

  it('ayni isimli rol ikinci kez olusturulamaz', async () => {
    await new CreateRoleHandler(uow).execute(command);
    await expect(new CreateRoleHandler(uow).execute(command)).rejects.toThrow(
      'Role with this name already exists',
    );
  });
});

describe('AssignPermissionToRoleHandler', () => {
  it('var olan izni role atar', async () => {
    const uow = new InMemoryUnitOfWork();
    const permission = Permission.create({
      module: 'catalog',
      resource: 'product',
      action: 'read',
    });
    await uow.permissions.save(permission);

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

    expect(uow.roles.store.get(roleId)!.getPermissionCodes()).toContain('catalog.product.read');
  });

  it('var olmayan izin atanamaz', async () => {
    const uow = new InMemoryUnitOfWork();
    const { roleId } = await new CreateRoleHandler(uow).execute({
      name: 'manager',
      displayName: 'Manager',
      companyId: null,
      description: null,
    });

    await expect(
      new AssignPermissionToRoleHandler(uow).execute({
        roleId,
        permissionCode: 'catalog.product.read',
      }),
    ).rejects.toThrow('does not exist');
  });
});

describe('RenameRoleHandler & DeactivateRoleHandler', () => {
  it('rolu yeniden adlandirir ve pasiflestirir', async () => {
    const uow = new InMemoryUnitOfWork();
    const { roleId } = await new CreateRoleHandler(uow).execute({
      name: 'manager',
      displayName: 'Manager',
      companyId: null,
      description: null,
    });

    await new RenameRoleHandler(uow).execute({
      roleId,
      name: 'supervisor',
      displayName: 'Supervisor',
    });
    expect(uow.roles.store.get(roleId)!.getName().value).toBe('supervisor');

    await new DeactivateRoleHandler(uow).execute({ roleId });
    expect(uow.roles.store.get(roleId)!.getStatus().isInactive()).toBe(true);
  });
});
