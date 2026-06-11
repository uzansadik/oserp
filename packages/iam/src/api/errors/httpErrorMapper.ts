import { ZodError } from 'zod';
import {
  BootstrapNotAllowedError,
  ForbiddenError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from '../../domain/errors/errors';
import { ApiError } from './ApiError';

export type HttpErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type MappedHttpError = {
  statusCode: number;
  body: HttpErrorBody;
};

/**
 * Domain/uygulama hatalarını HTTP durum kodu + gövdeye eşler.
 * - ZodError / ValidationError → 400
 * - NotFoundError → 404
 * - InvalidStateError → 409
 * - BootstrapNotAllowedError → 409 (DB dolu — bootstrap sadece bos DB'de)
 * - ForbiddenError → 403
 * - ApiError (örn. UnauthorizedError) → kendi statusCode'u
 * - diğer → 500
 */
export function mapErrorToHttp(error: unknown): MappedHttpError {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: 'VALIDATION',
          message: 'Request validation failed',
          details: error.issues,
        },
      },
    };
  }

  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: { error: { code: error.code, message: error.message } },
    };
  }

  if (error instanceof ValidationError) {
    return errorBody(400, error.code, error.message);
  }
  if (error instanceof NotFoundError) {
    return errorBody(404, error.code, error.message);
  }
  if (error instanceof InvalidStateError) {
    return errorBody(409, error.code, error.message);
  }
  if (error instanceof ForbiddenError) {
    return errorBody(403, error.code, error.message);
  }
  if (error instanceof BootstrapNotAllowedError) {
    return errorBody(409, error.code, error.message);
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return {
    statusCode: 500,
    body: { error: { code: 'INTERNAL', message } },
  };
}

function errorBody(statusCode: number, code: string, message: string): MappedHttpError {
  return { statusCode, body: { error: { code, message } } };
}
