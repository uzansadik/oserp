import { CreatePermissionHandler } from '@oserp-community/iam/application/handlers/PermissionHandlers';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryUnitOfWork } from '../../support/InMemoryUnitOfWork';

describe('CreatePermissionHandler', () => {
  let uow: InMemoryUnitOfWork;
  let handler: CreatePermissionHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    handler = new CreatePermissionHandler(uow);
  });

  it('yeni izin olusturur ve kaydeder', async () => {
    const { permissionId } = await handler.execute({
      module: 'catalog',
      resource: 'product',
      action: 'read',
    });

    expect(uow.permissions.store.has(permissionId)).toBe(true);
    expect(uow.permissions.codes.has('catalog.product.read')).toBe(true);
  });

  it('ayni kod ile ikinci izin olusturulamaz', async () => {
    const command = { module: 'catalog', resource: 'product', action: 'read' };
    await handler.execute(command);
    await expect(handler.execute(command)).rejects.toThrow('already exists');
  });
});
