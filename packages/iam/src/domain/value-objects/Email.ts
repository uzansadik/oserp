export class Email {
  private constructor(private readonly email: string) {}

  public static create(email: string): Email {
    if (!Email.validate(email)) {
      throw new Error('Invalid email format');
    }
    return new Email(email);
  }

  public get value(): string {
    return this.email;
  }

  private static validate(email: string): boolean {
    // Simple email validation regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  public toString(): string {
    return this.email;
  }
  static equals(email1: Email, email2: Email): boolean {
    return email1.value === email2.value;
  }
}
