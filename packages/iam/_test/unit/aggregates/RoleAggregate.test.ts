import { Role } from '@oserp-community/iam/domain/entities/Role';
import { RoleCreatedEvent } from '@oserp-community/iam/domain/events/RoleCreatedEvent';
import { RolePermissionAssignedEvent } from '@oserp-community/iam/domain/events/RolePermissionAssignedEvent';
import { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import { PermissionCode } from '@oserp-community/iam/domain/value-objects/PermissionCode';
import { RoleName } from '@oserp-community/iam/domain/value-objects/RoleName';
import { describe, expect, it } from 'vitest';

const makeRole = (isSystemRole = false) =>
  Role.create({
    name: RoleName.create('manager', 'Manager'),
    companyId: CompanyId.generate(),
    description: null,
    isSystemRole,
  });

describe('Role aggregate', () => {
  it('create ile RoleCreatedEvent eklenir', () => {
    const role = makeRole();
    expect(role.getStatus().isActive()).toBe(true);
    expect(role.getDomainEvents()[0]).toBeInstanceOf(RoleCreatedEvent);
  });

  it('assignPermission izin ekler ve event uretir', () => {
    const role = makeRole();
    const code = PermissionCode.create('catalog.product.read');

    role.assignPermission(code);

    expect(role.hasPermission(code)).toBe(true);
    expect(role.getPermissionCodes()).toContain('catalog.product.read');
    expect(role.getDomainEvents().at(-1)).toBeInstanceOf(RolePermissionAssignedEvent);
  });

  it('ayni izin iki kez atanamaz', () => {
    const role = makeRole();
    const code = PermissionCode.create('catalog.product.read');
    role.assignPermission(code);
    expect(() => role.assignPermission(code)).toThrow('is already assigned');
  });

  it('revokePermission atanmamis izinde hata firlatir', () => {
    const role = makeRole();
    const code = PermissionCode.create('catalog.product.read');
    expect(() => role.revokePermission(code)).toThrow('is not assigned');
  });

  it('sistem rolu yeniden adlandirilamaz ve pasiflestirilemez', () => {
    const role = makeRole(true);
    expect(() => role.rename(RoleName.create('other', 'Other'))).toThrow(
      'System role cannot be renamed',
    );
    expect(() => role.deactivate()).toThrow('System role cannot be deactivated');
  });
});
