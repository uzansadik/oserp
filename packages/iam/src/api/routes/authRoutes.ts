import type { FastifyInstance } from 'fastify';
import {
  loginSchema,
  logoutSchema,
  refreshSessionSchema,
} from '../../application/commands/AuthCommands';
import type { IamContainer } from '../../container';
import { createAuthController } from '../controllers/authController';
import { sendResult } from '../reply';

export function registerAuthRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createAuthController(container);
  app.get('/auth/health', async (request, reply) => {
    await sendResult(reply, { body: { status: 'ok' }, statusCode: 200 });
  });

  app.post('/auth/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    await sendResult(reply, await controller.login(input));
  });

  app.post('/auth/refresh', async (request, reply) => {
    const input = refreshSessionSchema.parse(request.body);
    await sendResult(reply, await controller.refresh(input));
  });

  app.post('/auth/logout', async (request, reply) => {
    const input = logoutSchema.parse(request.body);
    await sendResult(reply, await controller.logout(input));
  });
}
