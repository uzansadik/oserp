import { ValidationError } from '../errors/ValidationError';

/**
 * ReasonCode — Audit trail için zorunlu kod (ADJUSTMENT ve SCRAP için).
 * Sabit bir liste yerine serbest string; sistem predefined kodları
 * tanır, kullanıcı yenilerini ekleyebilir (ileride ReasonCodeCatalog).
 */
export class ReasonCode {
  private constructor(private readonly value: string) {}

  static create(code: string): ReasonCode {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new ValidationError('ReasonCode cannot be empty');
    }
    if (trimmed.length > 32) {
      throw new ValidationError(`ReasonCode too long (max 32): ${code}`);
    }
    if (!/^[A-Z0-9_\-]+$/.test(trimmed)) {
      throw new ValidationError(
        `ReasonCode may contain only uppercase letters, digits, '-' and '_': ${code}`,
      );
    }
    return new ReasonCode(trimmed);
  }

  getValue(): string { return this.value; }
  toString(): string { return this.value; }

  equals(other: ReasonCode): boolean { return this.value === other.value; }
  static equals(a: ReasonCode, b: ReasonCode): boolean { return a.value === b.value; }
}
