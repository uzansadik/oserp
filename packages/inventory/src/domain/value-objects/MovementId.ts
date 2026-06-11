import { ValidationError } from '../errors/ValidationError';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * MovementId — Stok hareketi aggregate root identity (UUID v4).
 */
export class MovementId {
  private constructor(private readonly value: string) {}

  static create(id: string): MovementId {
    if (!UUID_REGEX.test(id)) {
      throw new ValidationError(`movementId must be a valid UUID: ${id}`);
    }
    return new MovementId(id);
  }

  static generate(): MovementId {
    return new MovementId(crypto.randomUUID());
  }

  toString(): string {
    return this.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: MovementId): boolean {
    return this.value === other.value;
  }

  static equals(a: MovementId, b: MovementId): boolean {
    return a.value === b.value;
  }
}
