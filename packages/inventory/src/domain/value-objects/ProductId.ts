import { ValidationError } from '../errors/ValidationError';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * ProductId — Ürün aggregate root identity (UUID v4).
 */
export class ProductId {
  private constructor(private readonly value: string) {}

  static create(id: string): ProductId {
    if (!ProductId.validate(id)) {
      throw new ValidationError(`productId must be a valid UUID: ${id}`);
    }
    return new ProductId(id);
  }

  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }

  toString(): string {
    return this.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }

  static equals(a: ProductId, b: ProductId): boolean {
    return a.value === b.value;
  }

  private static validate(id: string): boolean {
    return UUID_REGEX.test(id);
  }
}
