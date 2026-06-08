export { iamRouter } from './iamRouter';
export type { AuthenticatedUser, ControllerResult, IamRouterOptions } from './types';
export { IamPermissions } from './permissions';
export { ApiError, UnauthorizedError } from './errors/ApiError';
export {
  type HttpErrorBody,
  type MappedHttpError,
  mapErrorToHttp,
} from './errors/httpErrorMapper';
