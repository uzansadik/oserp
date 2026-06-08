export class RoleName {
  private constructor(
    private readonly name: string,
    private readonly displayName: string,
  ) {}
  static create(name: string, displayName: string): RoleName {
    if (!name || name.trim() === '') {
      throw new Error('Role name cannot be empty');
    }
    if (name.length < 3 || name.length > 50) {
      throw new Error('Role name must be between 3 and 50 characters');
    }
    return new RoleName(name, displayName);
  }
  public get value(): string {
    return this.name;
  }
  public get display(): string {
    return this.displayName;
  }
}
