import type { Permission } from '../../domain/entities/Permission';
import type { Role } from '../../domain/entities/Role';
import { CompanyId } from '../../domain/value-objects/CompanyId';
import { RoleId } from '../../domain/value-objects/RoleId';
import { UserId } from '../../domain/value-objects/UserId';
import type { QueryHandler } from '../Handler';
import type { MembershipRepositoryPort } from '../ports/MembershipRepositoryPort';
import type { PermissionRepositoryPort } from '../ports/PermissionRepositoryPort';
import type { RoleRepositoryPort } from '../ports/RoleRepositoryPort';
import {
  type EffectivePermissionsView,
  type GetEffectivePermissionsQuery,
  type GetRoleByIdQuery,
  getEffectivePermissionsSchema,
  getRoleByIdSchema,
  type ListPermissionsQuery,
  type ListRolesQuery,
  listRolesSchema,
  type PermissionView,
  type RoleView,
} from '../queries/RoleQueries';

function toRoleView(role: Role): RoleView {
  const companyId = role.getCompanyId();
  return {
    id: role.getId().toString(),
    companyId: companyId ? companyId.toString() : null,
    name: role.getName().value,
    displayName: role.getName().display,
    description: role.getDescription(),
    isSystemRole: role.getIsSystemRole(),
    status: role.getStatus().value,
    permissionCodes: role.getPermissionCodes(),
  };
}

function toPermissionView(permission: Permission): PermissionView {
  const description = permission.getDescription();
  return {
    id: permission.getId().toString(),
    module: permission.getModule().getValue(),
    resource: permission.getResource().getValue(),
    action: permission.getAction().getValue(),
    code: permission.getCode().getValue(),
    description: description ? description.getValue() : null,
    createdAt: permission.getCreatedAt(),
  };
}

export class GetRoleByIdHandler implements QueryHandler<GetRoleByIdQuery, RoleView | null> {
  constructor(private readonly roles: RoleRepositoryPort) {}

  async execute(query: GetRoleByIdQuery): Promise<RoleView | null> {
    const { roleId } = getRoleByIdSchema.parse(query);
    const role = await this.roles.findById(RoleId.create(roleId));
    return role ? toRoleView(role) : null;
  }
}

export class ListRolesHandler implements QueryHandler<ListRolesQuery, RoleView[]> {
  constructor(private readonly roles: RoleRepositoryPort) {}

  async execute(query: ListRolesQuery): Promise<RoleView[]> {
    const { companyId } = listRolesSchema.parse(query);
    const roles = await this.roles.findByCompany(
      companyId === null ? null : CompanyId.create(companyId),
    );
    return roles.map(toRoleView);
  }
}

export class ListPermissionsHandler
  implements QueryHandler<ListPermissionsQuery, PermissionView[]>
{
  constructor(private readonly permissions: PermissionRepositoryPort) {}

  async execute(_query: ListPermissionsQuery): Promise<PermissionView[]> {
    const permissions = await this.permissions.findAll();
    return permissions.map(toPermissionView);
  }
}

export class GetEffectivePermissionsHandler
  implements QueryHandler<GetEffectivePermissionsQuery, EffectivePermissionsView>
{
  constructor(
    private readonly memberships: MembershipRepositoryPort,
    private readonly roles: RoleRepositoryPort,
  ) {}

  async execute(query: GetEffectivePermissionsQuery): Promise<EffectivePermissionsView> {
    const { userId, companyId } = getEffectivePermissionsSchema.parse(query);
    const userIdVo = UserId.create(userId);
    const companyIdVo = CompanyId.create(companyId);

    const membership = await this.memberships.findByUserAndCompany(userIdVo, companyIdVo);

    const codes = new Set<string>();
    if (membership && membership.getStatus() === 'active') {
      const roleIds = membership.getRoleIds().map((id) => RoleId.create(id));
      const roles = await this.roles.findManyByIds(roleIds);
      for (const role of roles) {
        if (role.getStatus().isActive()) {
          for (const code of role.getPermissionCodes()) {
            codes.add(code);
          }
        }
      }
    }

    return {
      userId,
      companyId,
      permissionCodes: [...codes],
    };
  }
}
