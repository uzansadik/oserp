import type { IamContainer } from '../container';

/** Doğrulanmış JWT'den çıkarılan istek kapsamındaki kimlik bilgisi. */
export type AuthenticatedUser = {
  userId: string;
  companyId: string | null;
  permissions: string[];
};

declare module 'fastify' {
  interface FastifyRequest {
    /** `authenticate` preHandler tarafından set edilir. */
    auth?: AuthenticatedUser;
  }
}

/** iamRouter eklentisine geçirilen seçenekler. */
export type IamRouterOptions = {
  container: IamContainer;
};

/** Controller'ların döndürdüğü çerçeveden bağımsız sonuç. */
export type ControllerResult = {
  statusCode: number;
  body: unknown;
};
