import { randomUUID } from 'crypto';

export class SessionId {
  private constructor(private readonly id: string) {}

  public static create(id: string): SessionId {
    if (!SessionId.validate(id)) {
      throw new Error('sessionId must be a valid UUID');
    }
    return new SessionId(id);
  }

  public static generate(): SessionId {
    return new SessionId(randomUUID());
  }

  toString(): string {
    return this.id;
  }

  equals(other: SessionId): boolean {
    return this.id === other.id;
  }

  getValue(): string {
    return this.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
