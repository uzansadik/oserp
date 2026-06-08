import type { Role } from '../../domain/entities/Role';
import type { CompanyId } from '../../domain/value-objects/CompanyId';
import type { RoleId } from '../../domain/value-objects/RoleId';
import type { RoleName } from '../../domain/value-objects/RoleName';

export interface RoleRepositoryPort {
  save(role: Role): Promise<void>;

  findById(id: RoleId): Promise<Role | null>;

  findManyByIds(ids: RoleId[]): Promise<Role[]>;

  findByCompany(companyId: CompanyId | null): Promise<Role[]>;

  existsByName(name: RoleName, companyId: CompanyId | null): Promise<boolean>;
}
