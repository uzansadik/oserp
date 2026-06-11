import { ZodError } from 'zod';
import {
  ConflictError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from '../../domain/errors';

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
 *  - ZodError / ValidationError → 400
 *  - NotFoundError → 404
 *  - InvalidStateError / ConflictError → 409
 *  - diğer → 500
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

  if (error instanceof ValidationError) {
    return errorBody(400, error.code, error.message);
  }
  if (error instanceof NotFoundError) {
    return errorBody(404, error.code, error.message);
  }
  if (error instanceof InvalidStateError) {
    return errorBody(409, error.code, error.message);
  }
  if (error instanceof ConflictError) {
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
