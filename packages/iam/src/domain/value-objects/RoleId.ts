import { randomUUID } from 'crypto';

export class RoleId {
  private constructor(private readonly id: string) {}

  public static create(id: string): RoleId {
    if (!RoleId.validate(id)) {
      throw new Error('roleId must be a valid UUID');
    }
    return new RoleId(id);
  }
  public static generate(): RoleId {
    return new RoleId(randomUUID());
  }
  toString(): string {
    return this.id;
  }

  equals(other: RoleId): boolean {
    return this.id === other.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
