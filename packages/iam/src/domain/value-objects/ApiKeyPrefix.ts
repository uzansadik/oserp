import { randomBytes } from 'crypto';

export class ApiKeyPrefix {
  private static readonly LENGTH = 8;
  private static readonly PATTERN = /^[A-Za-z0-9]{8}$/;

  private constructor(private readonly value: string) {}

  static create(value: string): ApiKeyPrefix {
    const normalized = value?.trim();

    if (!normalized) {
      throw new Error('API key prefix cannot be empty');
    }

    if (!ApiKeyPrefix.PATTERN.test(normalized)) {
      throw new Error('API key prefix must be 8 alphanumeric characters');
    }

    return new ApiKeyPrefix(normalized);
  }

  static generate(): ApiKeyPrefix {
    const prefix = randomBytes(ApiKeyPrefix.LENGTH)
      .toString('base64url')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, ApiKeyPrefix.LENGTH)
      .padEnd(ApiKeyPrefix.LENGTH, '0');

    return new ApiKeyPrefix(prefix);
  }

  equals(other: ApiKeyPrefix): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
