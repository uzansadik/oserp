/**
 * API taşıma katmanına özgü hatalar. Domain hatalarından ayrıdır; HTTP
 * kimlik doğrulama/iletişim hatalarını temsil eder.
 */
export abstract class ApiError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Kimlik doğrulanamadı (token yok/geçersiz/süresi dolmuş, hatalı kimlik bilgisi). */
export class UnauthorizedError extends ApiError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
}
