export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 128;

  private constructor(private readonly value: string) {}

  static create(value: string): Password {
    if (!value || value.length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (value.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }

    if (value.length > Password.MAX_LENGTH) {
      throw new Error(`Password cannot exceed ${Password.MAX_LENGTH} characters`);
    }

    if (!/[a-z]/.test(value)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(value)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(value)) {
      throw new Error('Password must contain at least one digit');
    }

    return new Password(value);
  }

  getValue(): string {
    return this.value;
  }
}
