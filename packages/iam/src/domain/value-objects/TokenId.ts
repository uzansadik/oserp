import { randomUUID } from 'crypto';

export class TokenId {
  private constructor(private readonly id: string) {}

  public static create(id: string): TokenId {
    if (!TokenId.validate(id)) {
      throw new Error('tokenId must be a valid UUID');
    }
    return new TokenId(id);
  }

  public static generate(): TokenId {
    return new TokenId(randomUUID());
  }

  toString(): string {
    return this.id;
  }

  equals(other: TokenId): boolean {
    return this.id === other.id;
  }

  getValue(): string {
    return this.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
