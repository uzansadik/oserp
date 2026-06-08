import { Role } from '@oserp-community/iam/domain/entities/Role';
import { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import { RoleId } from '@oserp-community/iam/domain/value-objects/RoleId';
import { RoleName } from '@oserp-community/iam/domain/value-objects/RoleName';
import { RoleStatus } from '@oserp-community/iam/domain/value-objects/RoleStatus';

export type RolePersistenceModel = {
  id: string;
  companyId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  status: string;
};

export function roleToPersistence(role: Role): RolePersistenceModel {
  const companyId = role.getCompanyId();
  return {
    id: role.getId().toString(),
    companyId: companyId ? companyId.toString() : null,
    name: role.getName().value,
    displayName: role.getName().display,
    description: role.getDescription(),
    isSystemRole: role.getIsSystemRole(),
    status: role.getStatus().value,
  };
}

export function roleToDomain(row: RolePersistenceModel, permissionCodes: string[]): Role {
  return Role.reconstitute({
    id: RoleId.create(row.id),
    companyId: row.companyId === null ? null : CompanyId.create(row.companyId),
    name: RoleName.create(row.name, row.displayName),
    description: row.description,
    isSystemRole: row.isSystemRole,
    status: RoleStatus.create(row.status),
    permissionCodes,
  });
}
