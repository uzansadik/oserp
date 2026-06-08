export class PermissionDescription {
  private constructor(private readonly value: string) {}

  static create(value: string): PermissionDescription {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error('Permission description cannot be empty');
    }

    if (normalized.length > 500) {
      throw new Error('Permission description cannot exceed 500 characters');
    }

    return new PermissionDescription(normalized);
  }

  equals(other: PermissionDescription): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
