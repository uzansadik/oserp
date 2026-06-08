import { Permission } from '../../domain/entities/Permission';
import { PermissionCode } from '../../domain/value-objects/PermissionCode';
import {
  type CreatePermissionCommand,
  createPermissionSchema,
} from '../commands/PermissionCommands';
import type { CommandHandler } from '../Handler';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';

export class CreatePermissionHandler
  implements CommandHandler<CreatePermissionCommand, { permissionId: string }>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: CreatePermissionCommand): Promise<{ permissionId: string }> {
    const command = createPermissionSchema.parse(input);

    const permission = Permission.create({
      module: command.module,
      resource: command.resource,
      action: command.action,
      description: command.description ?? null,
    });
    const code = PermissionCode.create(permission.getCode().getValue());

    return this.uow.execute(async (ctx) => {
      if (await ctx.permissions.existsByCode(code)) {
        throw new Error(`Permission ${code.getValue()} already exists`);
      }

      await ctx.permissions.save(permission);

      return { permissionId: permission.getId().toString() };
    });
  }
}
