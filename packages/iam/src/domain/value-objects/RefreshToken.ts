import { randomBytes } from 'crypto';

export class RefreshToken {
  private static readonly BYTE_LENGTH = 48;

  private constructor(private readonly value: string) {}

  static create(value: string): RefreshToken {
    const normalized = value?.trim();

    if (!normalized) {
      throw new Error('Refresh token cannot be empty');
    }

    return new RefreshToken(normalized);
  }

  static generate(): RefreshToken {
    return new RefreshToken(randomBytes(RefreshToken.BYTE_LENGTH).toString('base64url'));
  }

  equals(other: RefreshToken): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
