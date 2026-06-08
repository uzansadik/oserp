import type { FastifyInstance } from 'fastify';
import {
  assignPermissionToRoleSchema,
  createRoleSchema,
  deactivateRoleSchema,
  renameRoleSchema,
  revokePermissionFromRoleSchema,
} from '../../application/commands/RoleCommands';
import { getRoleByIdSchema, listRolesSchema } from '../../application/queries/RoleQueries';
import type { IamContainer } from '../../container';
import { createRoleController } from '../controllers/roleController';
import { createAuthenticate } from '../middlewares/authenticate';
import { createAuthorize } from '../middlewares/authorize';
import { IamPermissions } from '../permissions';
import { sendResult } from '../reply';

export function registerRoleRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createRoleController(container);
  const authenticate = createAuthenticate(container);

  app.post(
    '/roles',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleCreate)] },
    async (request, reply) => {
      const input = createRoleSchema.parse(request.body);
      await sendResult(reply, await controller.create(input));
    },
  );

  app.get(
    '/roles',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleList)] },
    async (request, reply) => {
      const query = request.query as { companyId?: string };
      const { companyId } = listRolesSchema.parse({ companyId: query.companyId ?? null });
      await sendResult(reply, await controller.list(companyId));
    },
  );

  app.get(
    '/roles/:roleId',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleRead)] },
    async (request, reply) => {
      const { roleId } = getRoleByIdSchema.parse(request.params);
      await sendResult(reply, await controller.getById(roleId));
    },
  );

  app.patch(
    '/roles/:roleId',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleUpdate)] },
    async (request, reply) => {
      const params = request.params as { roleId: string };
      const input = renameRoleSchema.parse({ roleId: params.roleId, ...(request.body as object) });
      await sendResult(reply, await controller.rename(input));
    },
  );

  app.post(
    '/roles/:roleId/permissions',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleUpdate)] },
    async (request, reply) => {
      const params = request.params as { roleId: string };
      const input = assignPermissionToRoleSchema.parse({
        roleId: params.roleId,
        ...(request.body as object),
      });
      await sendResult(reply, await controller.assignPermission(input));
    },
  );

  app.delete(
    '/roles/:roleId/permissions/:permissionCode',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleUpdate)] },
    async (request, reply) => {
      const params = request.params as { roleId: string; permissionCode: string };
      const input = revokePermissionFromRoleSchema.parse({
        roleId: params.roleId,
        permissionCode: params.permissionCode,
      });
      await sendResult(reply, await controller.revokePermission(input));
    },
  );

  app.post(
    '/roles/:roleId/deactivate',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.roleUpdate)] },
    async (request, reply) => {
      const input = deactivateRoleSchema.parse(request.params);
      await sendResult(reply, await controller.deactivate(input));
    },
  );
}
