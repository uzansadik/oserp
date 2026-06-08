import type { RoleRepositoryPort } from '@oserp-community/iam/application/ports/RoleRepositoryPort';
import type { Role } from '@oserp-community/iam/domain/entities/Role';
import type { CompanyId } from '@oserp-community/iam/domain/value-objects/CompanyId';
import type { RoleId } from '@oserp-community/iam/domain/value-objects/RoleId';
import type { RoleName } from '@oserp-community/iam/domain/value-objects/RoleName';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { roleToDomain, roleToPersistence } from '../mappers/RoleMapper';
import { iamRolePermissions, iamRoles } from '../schemas/iam.role.schema';

export class DrizzleRoleRepository implements RoleRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async save(role: Role): Promise<void> {
    const data = roleToPersistence(role);
    await this.db
      .insert(iamRoles)
      .values(data)
      .onConflictDoUpdate({
        target: iamRoles.id,
        set: {
          companyId: data.companyId,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          isSystemRole: data.isSystemRole,
          status: data.status,
          updatedAt: new Date(),
        },
      });

    await this.db.delete(iamRolePermissions).where(eq(iamRolePermissions.roleId, data.id));

    const codes = role.getPermissionCodes();
    if (codes.length > 0) {
      await this.db
        .insert(iamRolePermissions)
        .values(codes.map((permissionCode) => ({ roleId: data.id, permissionCode })));
    }
  }

  async findById(id: RoleId): Promise<Role | null> {
    const row = await this.db.query.iamRoles.findFirst({
      where: eq(iamRoles.id, id.toString()),
    });
    if (!row) return null;
    const codes = await this.loadPermissionCodes([row.id]);
    return roleToDomain(row, codes.get(row.id) ?? []);
  }

  async findManyByIds(ids: RoleId[]): Promise<Role[]> {
    if (ids.length === 0) return [];
    const idValues = ids.map((id) => id.toString());
    const rows = await this.db.query.iamRoles.findMany({
      where: inArray(iamRoles.id, idValues),
    });
    const codes = await this.loadPermissionCodes(rows.map((r) => r.id));
    return rows.map((row) => roleToDomain(row, codes.get(row.id) ?? []));
  }

  async findByCompany(companyId: CompanyId | null): Promise<Role[]> {
    const rows = await this.db.query.iamRoles.findMany({
      where:
        companyId === null
          ? isNull(iamRoles.companyId)
          : eq(iamRoles.companyId, companyId.toString()),
    });
    const codes = await this.loadPermissionCodes(rows.map((r) => r.id));
    return rows.map((row) => roleToDomain(row, codes.get(row.id) ?? []));
  }

  async existsByName(name: RoleName, companyId: CompanyId | null): Promise<boolean> {
    const row = await this.db.query.iamRoles.findFirst({
      where: and(
        eq(iamRoles.name, name.value),
        companyId === null
          ? isNull(iamRoles.companyId)
          : eq(iamRoles.companyId, companyId.toString()),
      ),
    });
    return row != null;
  }

  private async loadPermissionCodes(roleIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (roleIds.length === 0) return map;

    const rows = await this.db.query.iamRolePermissions.findMany({
      where: inArray(iamRolePermissions.roleId, roleIds),
    });

    for (const row of rows) {
      const list = map.get(row.roleId) ?? [];
      list.push(row.permissionCode);
      map.set(row.roleId, list);
    }
    return map;
  }
}
