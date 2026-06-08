import type {
  AssignRoleToMemberCommand,
  GrantMembershipCommand,
  RevokeRoleFromMemberCommand,
  SuspendMembershipCommand,
} from '../../application/commands/MembershipCommands';
import type { IamContainer } from '../../container';
import type { ControllerResult } from '../types';

export function createMembershipController(container: IamContainer) {
  return {
    async grant(input: GrantMembershipCommand): Promise<ControllerResult> {
      const result = await container.commands.grantMembership.execute(input);
      return { statusCode: 201, body: result };
    },

    async assignRole(input: AssignRoleToMemberCommand): Promise<ControllerResult> {
      await container.commands.assignRoleToMember.execute(input);
      return { statusCode: 204, body: null };
    },

    async revokeRole(input: RevokeRoleFromMemberCommand): Promise<ControllerResult> {
      await container.commands.revokeRoleFromMember.execute(input);
      return { statusCode: 204, body: null };
    },

    async suspend(input: SuspendMembershipCommand): Promise<ControllerResult> {
      await container.commands.suspendMembership.execute(input);
      return { statusCode: 204, body: null };
    },
  };
}
