import type { FastifyInstance } from 'fastify';
import { createPermissionSchema } from '../../application/commands/PermissionCommands';
import type { IamContainer } from '../../container';
import { createPermissionController } from '../controllers/permissionController';
import { createAuthenticate } from '../middlewares/authenticate';
import { createAuthorize } from '../middlewares/authorize';
import { IamPermissions } from '../permissions';
import { sendResult } from '../reply';

export function registerPermissionRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createPermissionController(container);
  const authenticate = createAuthenticate(container);

  app.post(
    '/permissions',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.permissionCreate)] },
    async (request, reply) => {
      const input = createPermissionSchema.parse(request.body);
      await sendResult(reply, await controller.create(input));
    },
  );

  app.get(
    '/permissions',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.permissionList)] },
    async (_request, reply) => {
      await sendResult(reply, await controller.list());
    },
  );
}
