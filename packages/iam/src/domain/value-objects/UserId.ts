import { randomUUID } from 'crypto';

export class UserId {
  private constructor(private readonly id: string) {}

  public static create(id: string): UserId {
    if (!UserId.validate(id)) {
      throw new Error('userId must be a valid UUID');
    }
    return new UserId(id);
  }
  public static generate(): UserId {
    return new UserId(randomUUID());
  }
  toString(): string {
    return this.id;
  }

  equals(other: UserId): boolean {
    return this.id === other.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
