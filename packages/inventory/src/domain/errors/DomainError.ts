/**
 * DomainError — Tüm domain hatalarının taban sınıfı.
 *
 * Application katmanı bu hatayı yakalayıp HTTP uygun response'a çevirir
 * (api/errors/httpErrorMapper.ts). UI katmanına sızdırılmaz.
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly metadata?: Readonly<Record<string, unknown>>;

  protected constructor(
    message: string,
    code: string,
    httpStatus: number,
    metadata?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    if (metadata) {
      this.metadata = metadata;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
