export type RoleStatusValue = 'active' | 'inactive';

export class RoleStatus {
  private static readonly allowedValues: RoleStatusValue[] = ['active', 'inactive'];

  private constructor(public readonly value: RoleStatusValue) {}

  static active(): RoleStatus {
    return new RoleStatus('active');
  }

  static inactive(): RoleStatus {
    return new RoleStatus('inactive');
  }

  static create(value: string): RoleStatus {
    if (!RoleStatus.isValid(value)) {
      throw new Error(`Invalid role status: ${value}`);
    }

    return new RoleStatus(value);
  }

  static isValid(value: string): value is RoleStatusValue {
    return RoleStatus.allowedValues.includes(value as RoleStatusValue);
  }

  equals(other: RoleStatus): boolean {
    return this.value === other.value;
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isInactive(): boolean {
    return this.value === 'inactive';
  }

  toString(): string {
    return this.value;
  }
}
