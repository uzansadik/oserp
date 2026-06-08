import { randomUUID } from 'crypto';

export class CompanyId {
  private constructor(private readonly id: string) {}

  public static create(id: string): CompanyId {
    if (!CompanyId.validate(id)) {
      throw new Error('companyId must be a valid UUID');
    }
    return new CompanyId(id);
  }
  public static generate(): CompanyId {
    return new CompanyId(randomUUID());
  }
  toString(): string {
    return this.id;
  }

  equals(other: CompanyId): boolean {
    return this.id === other.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
