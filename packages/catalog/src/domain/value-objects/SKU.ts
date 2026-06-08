import { InvalidSKU } from '../errors/InvalidSKU';

export class SKU {
  private readonly value: string;

  private static readonly SKU_REGEX = /^[A-Z0-9-]{3,32}$/;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): SKU {
    if (!value || !SKU.SKU_REGEX.test(value)) {
      throw new InvalidSKU(
        'Invalid SKU format. SKU must be 3-32 characters, uppercase letters, numbers, or hyphens.',
      );
    }
    return new SKU(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: SKU): boolean {
    return other instanceof SKU && this.value === other.value;
  }
}
