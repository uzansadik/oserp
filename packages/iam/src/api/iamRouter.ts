import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { mapErrorToHttp } from './errors/httpErrorMapper';
import { registerApiCredentialRoutes } from './routes/apiCredentialRoutes';
import { registerAuthRoutes } from './routes/authRoutes';
import { registerMembershipRoutes } from './routes/membershipRoutes';
import { registerPermissionRoutes } from './routes/permissionRoutes';
import { registerRoleRoutes } from './routes/roleRoutes';
import { registerUserRoutes } from './routes/userRoutes';
import type { IamRouterOptions } from './types';

/**
 * IAM bağlamının tüm HTTP route'larını ve hata eşleyicisini kaydeden Fastify
 * eklentisi. Tüketen uygulama (örn. `apps/api`) bir `IamContainer` geçirerek
 * `app.register(iamRouter, { container, prefix: '/iam' })` şeklinde mount eder.
 */
export const iamRouter: FastifyPluginAsync<IamRouterOptions> = async (
  app: FastifyInstance,
  options: IamRouterOptions,
): Promise<void> => {
  const { container } = options;

  app.setErrorHandler((error, _request, reply) => {
    const { statusCode, body } = mapErrorToHttp(error);
    return reply.code(statusCode).send(body);
  });

  registerAuthRoutes(app, container);
  registerUserRoutes(app, container);
  registerRoleRoutes(app, container);
  registerPermissionRoutes(app, container);
  registerMembershipRoutes(app, container);
  registerApiCredentialRoutes(app, container);
};
