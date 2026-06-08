import { ZodError } from 'zod';
import type {
  LoginCommand,
  LogoutCommand,
  RefreshSessionCommand,
} from '../../application/commands/AuthCommands';
import type { IamContainer } from '../../container';
import { UnauthorizedError } from '../errors/ApiError';
import type { ControllerResult } from '../types';

/**
 * Auth controller'ı. Login/refresh sırasında oluşan jenerik kimlik doğrulama
 * hatalarını `UnauthorizedError`'a (401) çevirir; şema (Zod) hataları olduğu
 * gibi yukarı taşınır (→ 400).
 */
export function createAuthController(container: IamContainer) {
  return {
    async login(input: LoginCommand): Promise<ControllerResult> {
      try {
        const tokens = await container.commands.login.execute(input);
        return { statusCode: 200, body: tokens };
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async refresh(input: RefreshSessionCommand): Promise<ControllerResult> {
      try {
        const tokens = await container.commands.refreshSession.execute(input);
        return { statusCode: 200, body: tokens };
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async logout(input: LogoutCommand): Promise<ControllerResult> {
      await container.commands.logout.execute(input);
      return { statusCode: 204, body: null };
    },
  };
}

function toAuthError(error: unknown): unknown {
  if (error instanceof ZodError) {
    return error;
  }
  return new UnauthorizedError('Invalid credentials');
}
