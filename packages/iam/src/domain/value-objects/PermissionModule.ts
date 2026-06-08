export class PermissionModule {
  private constructor(private readonly value: string) {}

  static create(value: string): PermissionModule {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Permission module cannot be empty');
    }

    if (normalized.length < 2) {
      throw new Error('Permission module is too short');
    }

    if (normalized.length > 50) {
      throw new Error('Permission module is too long');
    }

    if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
      throw new Error(
        'Permission module must start with a letter and contain only lowercase letters, numbers or underscore',
      );
    }

    return new PermissionModule(normalized);
  }

  equals(other: PermissionModule): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
