import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { IamContainer } from '../../container';
import { UnauthorizedError } from '../errors/ApiError';

function extractBearerToken(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw new UnauthorizedError('Missing bearer token');
  }
  return token;
}

/**
 * Authorization başlığındaki Bearer access token'ı doğrular ve
 * `request.auth`'a kimlik bilgisini yazar. Geçersizse `UnauthorizedError`.
 */
export function createAuthenticate(container: IamContainer): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const token = extractBearerToken(request.headers.authorization);

    let verified: Awaited<ReturnType<IamContainer['adapters']['tokenService']['verifyAccessToken']>>;
    try {
      verified = await container.adapters.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }

    request.auth = {
      userId: verified.sub,
      companyId: verified.companyId,
      permissions: verified.permissions,
    };
  };
}
