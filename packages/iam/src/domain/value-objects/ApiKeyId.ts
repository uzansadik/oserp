import { randomUUID } from 'crypto';

export class ApiKeyId {
  private constructor(private readonly id: string) {}

  public static create(id: string): ApiKeyId {
    if (!ApiKeyId.validate(id)) {
      throw new Error('apiKeyId must be a valid UUID');
    }
    return new ApiKeyId(id);
  }

  public static generate(): ApiKeyId {
    return new ApiKeyId(randomUUID());
  }

  toString(): string {
    return this.id;
  }

  equals(other: ApiKeyId): boolean {
    return this.id === other.id;
  }

  getValue(): string {
    return this.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
