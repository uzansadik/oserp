import type { FastifyInstance } from 'fastify';
import {
  assignRoleToMemberSchema,
  grantMembershipSchema,
  revokeRoleFromMemberSchema,
  suspendMembershipSchema,
} from '../../application/commands/MembershipCommands';
import type { IamContainer } from '../../container';
import { createMembershipController } from '../controllers/membershipController';
import { createAuthenticate } from '../middlewares/authenticate';
import { createAuthorize } from '../middlewares/authorize';
import { IamPermissions } from '../permissions';
import { sendResult } from '../reply';

export function registerMembershipRoutes(app: FastifyInstance, container: IamContainer): void {
  const controller = createMembershipController(container);
  const authenticate = createAuthenticate(container);

  app.post(
    '/memberships',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.membershipCreate)] },
    async (request, reply) => {
      const input = grantMembershipSchema.parse(request.body);
      await sendResult(reply, await controller.grant(input));
    },
  );

  app.post(
    '/memberships/:membershipId/roles',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.membershipUpdate)] },
    async (request, reply) => {
      const params = request.params as { membershipId: string };
      const input = assignRoleToMemberSchema.parse({
        membershipId: params.membershipId,
        ...(request.body as object),
      });
      await sendResult(reply, await controller.assignRole(input));
    },
  );

  app.delete(
    '/memberships/:membershipId/roles/:roleId',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.membershipUpdate)] },
    async (request, reply) => {
      const params = request.params as { membershipId: string; roleId: string };
      const input = revokeRoleFromMemberSchema.parse({
        membershipId: params.membershipId,
        roleId: params.roleId,
      });
      await sendResult(reply, await controller.revokeRole(input));
    },
  );

  app.post(
    '/memberships/:membershipId/suspend',
    { preHandler: [authenticate, createAuthorize(container, IamPermissions.membershipUpdate)] },
    async (request, reply) => {
      const input = suspendMembershipSchema.parse(request.params);
      await sendResult(reply, await controller.suspend(input));
    },
  );
}
