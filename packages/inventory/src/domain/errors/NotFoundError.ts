import { DomainError } from './DomainError';

/** Aranan aggregate/entity bulunamadı. HTTP 404. */
export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    identifier: string,
    metadata?: Readonly<Record<string, unknown>>,
  ) {
    super(
      `${resource} not found: ${identifier}`,
      'NOT_FOUND',
      404,
      metadata ? { ...metadata, resource, identifier } : { resource, identifier },
    );
  }
}
