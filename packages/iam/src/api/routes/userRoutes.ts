import type { FastifyInstance } from 'fastify';
import {
  changePasswordSchema,
  changeUserStatusSchema,
  registerUserSchema,
  verifyEmailSchema,
} from '../../application/commands/UserCommands';
import { getUserByIdSchema } from '../../application/queries/UserQueries';
import type { IamContainer } from '../../container';
import { createUserController } from '../controllers/userController';
import { createAuthenticate } from '../middlewares/authenticate';
import { createAuthorize } from '../middlewares/authorize';
import { IamPermissions } from '../permissions';
import { sendResult } from '../reply';

export function registerUserRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createUserController(container);
  const authenticate = createAuthenticate(container);

  app.post(
    '/users',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userCreate)] },
    async (request, reply) => {
      const input = registerUserSchema.parse(request.body);
      await sendResult(reply, await controller.register(input));
    },
  );

  /**
   * Sistem bootstrap endpoint — auth gerektirmez, sadece bos DB iken calisir.
   * Backoffice IAM kurulumu sirasinda cagirir; koruma yalnizca DB guard'ina
   * (users.count() === 0) dayanir. Internal docker network'un disindan bu
   * endpoint'e ulasilamamalidir (compose'da expose yok).
   */
  app.post('/users/bootstrap-register', async (request, reply) => {
    const input = registerUserSchema.parse(request.body);
    await sendResult(reply, await controller.bootstrap(input));
  });

  app.get(
    '/users',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userList)] },
    async (_request, reply) => {
      await sendResult(reply, await controller.list());
    },
  );

  app.get(
    '/users/:userId',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userRead)] },
    async (request, reply) => {
      const { userId } = getUserByIdSchema.parse(request.params);
      await sendResult(reply, await controller.getById(userId));
    },
  );

  app.post(
    '/users/:userId/verify-email',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userUpdate)] },
    async (request, reply) => {
      const input = verifyEmailSchema.parse(request.params);
      await sendResult(reply, await controller.verifyEmail(input));
    },
  );

  app.patch(
    '/users/:userId/status',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userUpdate)] },
    async (request, reply) => {
      const params = request.params as { userId: string };
      const input = changeUserStatusSchema.parse({
        userId: params.userId,
        ...(request.body as object),
      });
      await sendResult(reply, await controller.changeStatus(input));
    },
  );

  app.patch(
    '/users/:userId/password',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.userUpdate)] },
    async (request, reply) => {
      const params = request.params as { userId: string };
      const input = changePasswordSchema.parse({
        userId: params.userId,
        ...(request.body as object),
      });
      await sendResult(reply, await controller.changePassword(input));
    },
  );
}
