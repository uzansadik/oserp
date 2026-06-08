import type {
  AssignPermissionToRoleCommand,
  CreateRoleCommand,
  DeactivateRoleCommand,
  RenameRoleCommand,
  RevokePermissionFromRoleCommand,
} from '../../application/commands/RoleCommands';
import type { IamContainer } from '../../container';
import type { ControllerResult } from '../types';

export function createRoleController(container: IamContainer) {
  return {
    async create(input: CreateRoleCommand): Promise<ControllerResult> {
      const result = await container.commands.createRole.execute(input);
      return { statusCode: 201, body: result };
    },

    async rename(input: RenameRoleCommand): Promise<ControllerResult> {
      await container.commands.renameRole.execute(input);
      return { statusCode: 204, body: null };
    },

    async assignPermission(input: AssignPermissionToRoleCommand): Promise<ControllerResult> {
      await container.commands.assignPermissionToRole.execute(input);
      return { statusCode: 204, body: null };
    },

    async revokePermission(input: RevokePermissionFromRoleCommand): Promise<ControllerResult> {
      await container.commands.revokePermissionFromRole.execute(input);
      return { statusCode: 204, body: null };
    },

    async deactivate(input: DeactivateRoleCommand): Promise<ControllerResult> {
      await container.commands.deactivateRole.execute(input);
      return { statusCode: 204, body: null };
    },

    async getById(roleId: string): Promise<ControllerResult> {
      const role = await container.queries.getRoleById.execute({ roleId });
      if (!role) {
        return { statusCode: 404, body: { error: { code: 'NOT_FOUND', message: 'Role not found' } } };
      }
      return { statusCode: 200, body: role };
    },

    async list(companyId: string | null): Promise<ControllerResult> {
      const roles = await container.queries.listRoles.execute({ companyId });
      return { statusCode: 200, body: roles };
    },
  };
}
