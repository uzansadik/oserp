import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { IamContainer } from '../../container';
import { UnauthorizedError } from '../errors/ApiError';

/**
 * İstekteki şirket kapsamını çözer. Varsayılan olarak token'daki `companyId`
 * kullanılır; route'a özel çözümleme için override fonksiyonu geçirilebilir.
 */
export type CompanyIdResolver = (request: FastifyRequest) => string | null | undefined;

/**
 * Kimliği doğrulanmış kullanıcının, çözülen şirket kapsamında `requiredCode`
 * iznine sahip olmasını zorunlu kılan preHandler üretir. İzin yoksa
 * `AuthorizationPolicy` `ForbiddenError` fırlatır (→ 403).
 *
 * `authenticate` preHandler'ından SONRA çalışmalıdır.
 */
export function createAuthorize(
  container: IamContainer,
  requiredCode: string,
  resolveCompanyId?: CompanyIdResolver,
): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const auth = request.auth;
    if (!auth) {
      throw new UnauthorizedError('Authentication required');
    }

    const companyId = resolveCompanyId ? resolveCompanyId(request) : auth.companyId;
    if (!companyId) {
      throw new UnauthorizedError('Company scope could not be resolved');
    }

    await container.policies.authorization.authorize(
      { userId: auth.userId, companyId },
      requiredCode,
    );
  };
}
