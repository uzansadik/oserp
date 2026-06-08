import { ForbiddenError } from '../../domain/errors/errors';
import { PermissionEvaluator } from '../../domain/services/PermissionEvaluator';
import type { GetEffectivePermissionsHandler } from '../handlers/RoleQueryHandlers';

export type AuthorizationContext = {
  userId: string;
  companyId: string;
};

/**
 * Bir kullanıcının belirli bir şirket kapsamında, gerekli izin kodlarına sahip olup
 * olmadığını denetler. Efektif izinleri `GetEffectivePermissionsHandler` üzerinden
 * okur ve `PermissionEvaluator` (joker destekli) ile değerlendirir.
 */
export class AuthorizationPolicy {
  constructor(private readonly getEffectivePermissions: GetEffectivePermissionsHandler) {}

  private async evaluatorFor(context: AuthorizationContext): Promise<PermissionEvaluator> {
    const { permissionCodes } = await this.getEffectivePermissions.execute({
      userId: context.userId,
      companyId: context.companyId,
    });
    return new PermissionEvaluator(permissionCodes);
  }

  /** Kullanıcı gerekli izne sahip mi? */
  async can(context: AuthorizationContext, requiredCode: string): Promise<boolean> {
    const evaluator = await this.evaluatorFor(context);
    return evaluator.hasCode(requiredCode);
  }

  /** Kullanıcı verilen izinlerin tümüne sahip mi? */
  async canAll(context: AuthorizationContext, requiredCodes: string[]): Promise<boolean> {
    const evaluator = await this.evaluatorFor(context);
    return requiredCodes.every((code) => evaluator.hasCode(code));
  }

  /** Kullanıcı verilen izinlerden en az birine sahip mi? */
  async canAny(context: AuthorizationContext, requiredCodes: string[]): Promise<boolean> {
    const evaluator = await this.evaluatorFor(context);
    return requiredCodes.some((code) => evaluator.hasCode(code));
  }

  /** İzin yoksa `ForbiddenError` fırlatır. */
  async authorize(context: AuthorizationContext, requiredCode: string): Promise<void> {
    if (!(await this.can(context, requiredCode))) {
      throw new ForbiddenError(`Missing required permission: ${requiredCode}`);
    }
  }

  /** İzinlerin tümü yoksa `ForbiddenError` fırlatır. */
  async authorizeAll(context: AuthorizationContext, requiredCodes: string[]): Promise<void> {
    const evaluator = await this.evaluatorFor(context);
    const missing = requiredCodes.filter((code) => !evaluator.hasCode(code));
    if (missing.length > 0) {
      throw new ForbiddenError(`Missing required permissions: ${missing.join(', ')}`);
    }
  }
}
