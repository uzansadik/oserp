import type { PermissionRepositoryPort } from '@oserp-community/iam/application/ports/PermissionRepositoryPort';
import type { Permission } from '@oserp-community/iam/domain/entities/Permission';
import type { PermissionId } from '@oserp-community/iam/domain/value-objects';
import type { PermissionCode } from '@oserp-community/iam/domain/value-objects/PermissionCode';
import { eq } from 'drizzle-orm';
import type { IamDbClient } from '../db';
import { permissionToDomain, permissionToPersistence } from '../mappers/PermissionMapper';
import { iamPermissions } from '../schemas/iam.permission.schema';

export class DrizzlePermissionRepository implements PermissionRepositoryPort {
  constructor(private readonly db: IamDbClient) {}

  async existsByCode(code: PermissionCode): Promise<boolean> {
    const count = await this.db.query.iamPermissions.findMany({
      where: eq(iamPermissions.code, code.getValue()),
    });
    return count.length > 0;
  }

  async save(permission: Permission): Promise<void> {
    const data = permissionToPersistence(permission);

    await this.db
      .insert(iamPermissions)
      .values(data)
      .onConflictDoUpdate({
        target: iamPermissions.id,
        set: {
          module: data.module,
          resource: data.resource,
          action: data.action,
          code: data.code,
          description: data.description,
        },
      });
  }

  async findById(id: PermissionId): Promise<Permission | null> {
    const row = await this.db.query.iamPermissions.findFirst({
      where: eq(iamPermissions.id, id.getValue()),
    });

    if (!row) return null;

    return permissionToDomain(row);
  }

  async findByCode(code: PermissionCode): Promise<Permission | null> {
    const row = await this.db.query.iamPermissions.findFirst({
      where: eq(iamPermissions.code, code.getValue()),
    });

    if (!row) return null;

    return permissionToDomain(row);
  }

  async findAll(): Promise<Permission[]> {
    const rows = await this.db.query.iamPermissions.findMany();
    return rows.map(permissionToDomain);
  }
}
