import type { CreatePermissionCommand } from '../../application/commands/PermissionCommands';
import type { IamContainer } from '../../container';
import type { ControllerResult } from '../types';

export function createPermissionController(container: IamContainer) {
  return {
    async create(input: CreatePermissionCommand): Promise<ControllerResult> {
      const result = await container.commands.createPermission.execute(input);
      return { statusCode: 201, body: result };
    },

    async list(): Promise<ControllerResult> {
      const permissions = await container.queries.listPermissions.execute({});
      return { statusCode: 200, body: permissions };
    },
  };
}
