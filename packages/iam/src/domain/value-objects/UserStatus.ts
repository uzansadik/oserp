export type UserStatusValue = 'active' | 'inactive' | 'suspended' | 'invited';

export class UserStatus {
  private static readonly allowedValues: UserStatusValue[] = [
    'active',
    'inactive',
    'suspended',
    'invited',
  ];

  private constructor(public readonly value: UserStatusValue) {}

  static active(): UserStatus {
    return new UserStatus('active');
  }

  static inactive(): UserStatus {
    return new UserStatus('inactive');
  }

  static suspended(): UserStatus {
    return new UserStatus('suspended');
  }

  static invited(): UserStatus {
    return new UserStatus('invited');
  }

  static create(value: string): UserStatus {
    if (!UserStatus.isValid(value)) {
      throw new Error(`Invalid user status: ${value}`);
    }

    return new UserStatus(value);
  }

  static isValid(value: string): value is UserStatusValue {
    return UserStatus.allowedValues.includes(value as UserStatusValue);
  }

  equals(other: UserStatus): boolean {
    return this.value === other.value;
  }

  isActive(): boolean {
    return this.value === 'active';
  }

  isInactive(): boolean {
    return this.value === 'inactive';
  }

  isSuspended(): boolean {
    return this.value === 'suspended';
  }

  isInvited(): boolean {
    return this.value === 'invited';
  }

  canLogin(): boolean {
    return this.value === 'active';
  }

  canBeActivated(): boolean {
    return this.value === 'inactive' || this.value === 'invited';
  }

  canBeSuspended(): boolean {
    return this.value === 'active';
  }

  canBeDeactivated(): boolean {
    return this.value === 'active' || this.value === 'suspended';
  }

  toString(): string {
    return this.value;
  }
}
