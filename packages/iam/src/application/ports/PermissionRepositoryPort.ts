import type { Permission } from '../../domain/entities/Permission';
import type { PermissionCode } from '../../domain/value-objects/PermissionCode';
import type { PermissionId } from '../../domain/value-objects/PermissionId';

export interface PermissionRepositoryPort {
  save(permission: Permission): Promise<void>;

  findById(id: PermissionId): Promise<Permission | null>;

  findByCode(code: PermissionCode): Promise<Permission | null>;

  existsByCode(code: PermissionCode): Promise<boolean>;

  findAll(): Promise<Permission[]>;
}
