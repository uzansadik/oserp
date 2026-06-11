import { ValidationError } from '../errors/ValidationError';

const SKU_REGEX = /^[A-Z0-9][A-Z0-9_\-]{1,63}$/;

/**
 * Sku — Stock Keeping Unit (business key). Ürün aggregate'inin dışarıdan
 * görünen tekil iş anahtarı. Format: büyük harf, rakam, tire/alt çizgi.
 *
 * SKU benzersizliği DB seviyesinde (unique constraint) sağlanır.
 */
export class Sku {
  private constructor(private readonly value: string) {}

  static create(sku: string): Sku {
    const normalized = sku.trim().toUpperCase();
    if (!normalized) {
      throw new ValidationError('Sku cannot be empty');
    }
    if (normalized.length < 2 || normalized.length > 64) {
      throw new ValidationError(
        `Sku must be between 2 and 64 characters: ${normalized}`,
      );
    }
    if (!SKU_REGEX.test(normalized)) {
      throw new ValidationError(
        `Sku may contain only uppercase letters, digits, '-' and '_': ${normalized}`,
      );
    }
    return new Sku(normalized);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: Sku): boolean {
    return this.value === other.value;
  }

  static equals(a: Sku, b: Sku): boolean {
    return a.value === b.value;
  }
}
