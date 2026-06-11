import { DomainError } from './DomainError';

/** Concurrency / unique constraint ihlali. HTTP 409. */
export class ConflictError extends DomainError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, 'CONFLICT', 409, metadata);
  }
}
