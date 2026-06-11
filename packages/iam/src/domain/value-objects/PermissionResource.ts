export class PermissionResource {
  private constructor(private readonly value: string) {}

  static create(value: string): PermissionResource {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Permission resource cannot be empty');
    }

    if (normalized !== '*' && normalized.length < 2) {
      throw new Error('Permission resource is too short');
    }

    if (normalized !== '*' && normalized.length > 80) {
      throw new Error('Permission resource is too long');
    }

    if (!/^[a-z][a-z0-9_]*$/.test(normalized) && normalized !== '*') {
      throw new Error(
        'Permission resource must start with a letter and contain only lowercase letters, numbers or underscore',
      );
    }

    return new PermissionResource(normalized);
  }

  equals(other: PermissionResource): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
