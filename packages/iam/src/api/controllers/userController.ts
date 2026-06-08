import type {
  ChangePasswordCommand,
  ChangeUserStatusCommand,
  RegisterUserCommand,
  VerifyEmailCommand,
} from '../../application/commands/UserCommands';
import type { IamContainer } from '../../container';
import type { ControllerResult } from '../types';

export function createUserController(container: IamContainer) {
  return {
    async register(input: RegisterUserCommand): Promise<ControllerResult> {
      const result = await container.commands.registerUser.execute(input);
      return { statusCode: 201, body: result };
    },

    async changePassword(input: ChangePasswordCommand): Promise<ControllerResult> {
      await container.commands.changePassword.execute(input);
      return { statusCode: 204, body: null };
    },

    async verifyEmail(input: VerifyEmailCommand): Promise<ControllerResult> {
      await container.commands.verifyEmail.execute(input);
      return { statusCode: 204, body: null };
    },

    async changeStatus(input: ChangeUserStatusCommand): Promise<ControllerResult> {
      await container.commands.changeUserStatus.execute(input);
      return { statusCode: 204, body: null };
    },

    async getById(userId: string): Promise<ControllerResult> {
      const user = await container.queries.getUserById.execute({ userId });
      if (!user) {
        return { statusCode: 404, body: { error: { code: 'NOT_FOUND', message: 'User not found' } } };
      }
      return { statusCode: 200, body: user };
    },

    async list(): Promise<ControllerResult> {
      const users = await container.queries.listUsers.execute({});
      return { statusCode: 200, body: users };
    },
  };
}
