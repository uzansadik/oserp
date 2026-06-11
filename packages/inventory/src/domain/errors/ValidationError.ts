import { DomainError } from './DomainError';

/** Girdi veya invariant ihlali. HTTP 400. */
export class ValidationError extends DomainError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, 'VALIDATION_ERROR', 400, metadata);
  }
}
