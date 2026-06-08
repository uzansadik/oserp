import { RoleCreatedEvent } from '@oserp-community/iam/domain/events/RoleCreatedEvent';
import { RoleDeactivatedEvent } from '@oserp-community/iam/domain/events/RoleDeactivatedEvent';
import { RolePermissionAssignedEvent } from '@oserp-community/iam/domain/events/RolePermissionAssignedEvent';
import { RolePermissionRevokedEvent } from '@oserp-community/iam/domain/events/RolePermissionRevokedEvent';
import { RoleRenamedEvent } from '@oserp-community/iam/domain/events/RoleRenamedEvent';
import type { CompanyId } from '../value-objects/CompanyId';
import type { PermissionCode } from '../value-objects/PermissionCode';
import { RoleId } from '../value-objects/RoleId';
import type { RoleName } from '../value-objects/RoleName';
import { RoleStatus } from '../value-objects/RoleStatus';
import { AggregateRoot } from './AggregateRoot';

export type CreateRoleProps = {
  name: RoleName;
  companyId: CompanyId | null;
  description?: string | null;
  isSystemRole?: boolean;
};

export type ReconstituteRoleProps = {
  id: RoleId;
  name: RoleName;
  companyId: CompanyId | null;
  description: string | null;
  isSystemRole: boolean;
  status: RoleStatus;
  permissionCodes: string[];
};

export class Role extends AggregateRoot {
  private readonly permissionCodes: Set<string>;

  private constructor(
    private readonly id: RoleId,
    private readonly companyId: CompanyId | null,
    private name: RoleName,
    private description: string | null,
    private readonly isSystemRole: boolean,
    private status: RoleStatus,
    permissionCodes: Set<string>,
  ) {
    super();
    this.permissionCodes = permissionCodes;
  }

  static create(props: CreateRoleProps): Role {
    const role = new Role(
      RoleId.generate(),
      props.companyId,
      props.name,
      props.description ?? null,
      props.isSystemRole ?? false,
      RoleStatus.active(),
      new Set<string>(),
    );

    role.addDomainEvent(
      new RoleCreatedEvent(
        role.id.toString(),
        props.name.value,
        props.companyId ? props.companyId.toString() : null,
        role.isSystemRole,
      ),
    );

    return role;
  }

  static reconstitute(props: ReconstituteRoleProps): Role {
    return new Role(
      props.id,
      props.companyId,
      props.name,
      props.description,
      props.isSystemRole,
      props.status,
      new Set<string>(props.permissionCodes),
    );
  }

  rename(name: RoleName): void {
    if (this.isSystemRole) {
      throw new Error('System role cannot be renamed');
    }
    if (this.name.value === name.value) {
      throw new Error('New name is the same as the current name');
    }
    this.name = name;
    this.addDomainEvent(new RoleRenamedEvent(this.id.toString(), name.value));
  }

  assignPermission(code: PermissionCode): void {
    const value = code.getValue();
    if (this.permissionCodes.has(value)) {
      throw new Error(`Permission ${value} is already assigned to this role`);
    }
    this.permissionCodes.add(value);
    this.addDomainEvent(new RolePermissionAssignedEvent(this.id.toString(), value));
  }

  revokePermission(code: PermissionCode): void {
    const value = code.getValue();
    if (!this.permissionCodes.has(value)) {
      throw new Error(`Permission ${value} is not assigned to this role`);
    }
    this.permissionCodes.delete(value);
    this.addDomainEvent(new RolePermissionRevokedEvent(this.id.toString(), value));
  }

  hasPermission(code: PermissionCode): boolean {
    return this.permissionCodes.has(code.getValue());
  }

  deactivate(): void {
    if (this.isSystemRole) {
      throw new Error('System role cannot be deactivated');
    }
    if (this.status.isInactive()) {
      throw new Error('Role is already inactive');
    }
    this.status = RoleStatus.inactive();
    this.addDomainEvent(new RoleDeactivatedEvent(this.id.toString()));
  }

  getId(): RoleId {
    return this.id;
  }

  getCompanyId(): CompanyId | null {
    return this.companyId;
  }

  getName(): RoleName {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getStatus(): RoleStatus {
    return this.status;
  }

  getIsSystemRole(): boolean {
    return this.isSystemRole;
  }

  getPermissionCodes(): string[] {
    return [...this.permissionCodes];
  }
}
