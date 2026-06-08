import { randomUUID } from 'crypto';

export class MembershipId {
  private constructor(private readonly id: string) {}

  public static create(id: string): MembershipId {
    if (!MembershipId.validate(id)) {
      throw new Error('membershipId must be a valid UUID');
    }
    return new MembershipId(id);
  }

  public static generate(): MembershipId {
    return new MembershipId(randomUUID());
  }

  toString(): string {
    return this.id;
  }

  equals(other: MembershipId): boolean {
    return this.id === other.id;
  }

  getValue(): string {
    return this.id;
  }

  private static validate(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }
}
