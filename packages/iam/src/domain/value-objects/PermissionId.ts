import { randomUUID } from 'crypto';

export class PermissionId {
  private constructor(private readonly id: string) {}

  public static create(id: string): PermissionId {
    if (!PermissionId.validate(id)) {
      throw new Error('permissionId must be a valid UUID');
    }
    return new PermissionId(id);
  }
  public static generate(): PermissionId {
    return new PermissionId(randomUUID());
  }
  toString(): string {
    return this.id;
  }

  equals(other: PermissionId): boolean {
    return this.id === other.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
  getValue(): string {
    return this.id;
  }
}
