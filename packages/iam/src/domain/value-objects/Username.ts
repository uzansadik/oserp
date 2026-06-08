export class Username {
  private constructor(private readonly username: string) {}
  static create(username: string): Username {
    if (!username || username.trim() === '') {
      throw new Error('Username cannot be empty');
    }
    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be between 3 and 20 characters');
    }
    return new Username(username);
  }
  public get value(): string {
    return this.username;
  }
  static equals(username1: Username, username2: Username): boolean {
    return username1.value === username2.value;
  }
}
