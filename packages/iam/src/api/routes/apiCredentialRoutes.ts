import type { FastifyInstance } from 'fastify';
import {
  issueApiCredentialSchema,
  revokeApiCredentialSchema,
  rotateApiCredentialSchema,
} from '../../application/commands/ApiCredentialCommands';
import type { IamContainer } from '../../container';
import { createApiCredentialController } from '../controllers/apiCredentialController';
import { createAuthenticate } from '../middlewares/authenticate';
import { createAuthorize } from '../middlewares/authorize';
import { IamPermissions } from '../permissions';
import { sendResult } from '../reply';

export function registerApiCredentialRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createApiCredentialController(container);
  const authenticate = createAuthenticate(container);

  app.post(
    '/api-credentials',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.apiCredentialCreate)] },
    async (request, reply) => {
      const input = issueApiCredentialSchema.parse(request.body);
      await sendResult(reply, await controller.issue(input));
    },
  );

  app.post(
    '/api-credentials/:apiKeyId/rotate',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.apiCredentialUpdate)] },
    async (request, reply) => {
      const input = rotateApiCredentialSchema.parse(request.params);
      await sendResult(reply, await controller.rotate(input));
    },
  );

  app.post(
    '/api-credentials/:apiKeyId/revoke',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.apiCredentialUpdate)] },
    async (request, reply) => {
      const input = revokeApiCredentialSchema.parse(request.params);
      await sendResult(reply, await controller.revoke(input));
    },
  );
}
