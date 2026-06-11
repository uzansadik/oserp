import { DomainError } from './DomainError';

export class InvalidStateError extends DomainError {
  readonly code = 'INVALID_STATE';
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}

/**
 * Sistem bootstrap (ilk admin seed) sadece bos DB iken kabul edilir.
 * Dolu DB'de tekrar cagrildiginda firlatilir — HTTP katmaninda 409 doner.
 */
export class BootstrapNotAllowedError extends DomainError {
  readonly code = 'BOOTSTRAP_NOT_ALLOWED';
}
