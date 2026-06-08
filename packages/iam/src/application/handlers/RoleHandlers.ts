import { Role } from '../../domain/entities/Role';
import { CompanyId } from '../../domain/value-objects/CompanyId';
import { PermissionCode } from '../../domain/value-objects/PermissionCode';
import { RoleId } from '../../domain/value-objects/RoleId';
import { RoleName } from '../../domain/value-objects/RoleName';
import {
  type AssignPermissionToRoleCommand,
  assignPermissionToRoleSchema,
  type CreateRoleCommand,
  createRoleSchema,
  type DeactivateRoleCommand,
  deactivateRoleSchema,
  type RenameRoleCommand,
  type RevokePermissionFromRoleCommand,
  renameRoleSchema,
  revokePermissionFromRoleSchema,
} from '../commands/RoleCommands';
import type { CommandHandler } from '../Handler';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

export class CreateRoleHandler implements CommandHandler<CreateRoleCommand, { roleId: string }> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: CreateRoleCommand): Promise<{ roleId: string }> {
    const command = createRoleSchema.parse(input);
    const name = RoleName.create(command.name, command.displayName);
    const companyId = command.companyId === null ? null : CompanyId.create(command.companyId);

    return this.uow.execute(async (ctx) => {
      if (await ctx.roles.existsByName(name, companyId)) {
        throw new Error('Role with this name already exists');
      }

      const role = Role.create({
        name,
        companyId,
        description: command.description ?? null,
        isSystemRole: command.isSystemRole ?? false,
      });

      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();

      return { roleId: role.getId().toString() };
    });
  }
}

export class RenameRoleHandler implements CommandHandler<RenameRoleCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: RenameRoleCommand): Promise<void> {
    const command = renameRoleSchema.parse(input);
    const roleId = RoleId.create(command.roleId);
    const name = RoleName.create(command.name, command.displayName);

    await this.uow.execute(async (ctx) => {
      const role = await ctx.roles.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      role.rename(name);
      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();
    });
  }
}

export class AssignPermissionToRoleHandler
  implements CommandHandler<AssignPermissionToRoleCommand>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: AssignPermissionToRoleCommand): Promise<void> {
    const command = assignPermissionToRoleSchema.parse(input);
    const roleId = RoleId.create(command.roleId);
    const code = PermissionCode.create(command.permissionCode);

    await this.uow.execute(async (ctx) => {
      if (!(await ctx.permissions.existsByCode(code))) {
        throw new Error(`Permission ${code.getValue()} does not exist`);
      }

      const role = await ctx.roles.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      role.assignPermission(code);
      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();
    });
  }
}

export class RevokePermissionFromRoleHandler
  implements CommandHandler<RevokePermissionFromRoleCommand>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: RevokePermissionFromRoleCommand): Promise<void> {
    const command = revokePermissionFromRoleSchema.parse(input);
    const roleId = RoleId.create(command.roleId);
    const code = PermissionCode.create(command.permissionCode);

    await this.uow.execute(async (ctx) => {
      const role = await ctx.roles.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      role.revokePermission(code);
      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();
    });
  }
}

export class DeactivateRoleHandler implements CommandHandler<DeactivateRoleCommand> {
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: DeactivateRoleCommand): Promise<void> {
    const command = deactivateRoleSchema.parse(input);
    const roleId = RoleId.create(command.roleId);

    await this.uow.execute(async (ctx) => {
      const role = await ctx.roles.findById(roleId);
      if (!role) {
        throw new Error('Role not found');
      }

      role.deactivate();
      await ctx.roles.save(role);
      await ctx.outbox.enqueue(role.getDomainEvents());
      role.clearDomainEvents();
    });
  }
}
