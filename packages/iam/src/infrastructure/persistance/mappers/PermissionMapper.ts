import { Permission } from '@oserp-community/iam/domain/entities/Permission';

export type PermissionPersistenceModel = {
  id: string;
  module: string;
  resource: string;
  action: string;
  code: string;
  description: string | null;
  createdAt: Date;
};

export function permissionToPersistence(permission: Permission): PermissionPersistenceModel {
  return {
    id: permission.getId().getValue(),
    module: permission.getModule().getValue(),
    resource: permission.getResource().getValue(),
    action: permission.getAction().getValue(),
    code: permission.getCode().getValue(),
    description: permission.getDescription()?.getValue() ?? null,
    createdAt: permission.getCreatedAt(),
  };
}

export function permissionToDomain(row: PermissionPersistenceModel): Permission {
  return Permission.reconstitute({
    id: row.id,
    module: row.module,
    resource: row.resource,
    action: row.action,
    code: row.code,
    description: row.description,
    createdAt: row.createdAt,
  });
}
