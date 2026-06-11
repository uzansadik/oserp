import { DomainError } from './DomainError';

/** Aggregate mevcut state'inde yapılamayacak işlem. HTTP 409. */
export class InvalidStateError extends DomainError {
  constructor(message: string, metadata?: Readonly<Record<string, unknown>>) {
    super(message, 'INVALID_STATE', 409, metadata);
  }
}
