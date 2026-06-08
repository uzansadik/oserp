export type PasswordHashAlgorithm = 'argon2' | 'bcrypt' | 'unknown';

export class PasswordHash {
  private constructor(
    private readonly hash: string,
    private readonly algorithm: PasswordHashAlgorithm,
  ) {}

  static create(hash: string): PasswordHash {
    const normalized = hash?.trim();

    if (!normalized) {
      throw new Error('Password hash cannot be empty');
    }

    const algorithm = PasswordHash.detectAlgorithm(normalized);

    if (algorithm === 'unknown') {
      throw new Error('Unsupported password hash algorithm');
    }

    return new PasswordHash(normalized, algorithm);
  }

  private static detectAlgorithm(hash: string): PasswordHashAlgorithm {
    if (hash.startsWith('$argon2id$') || hash.startsWith('$argon2i$')) {
      return 'argon2';
    }

    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      return 'bcrypt';
    }

    return 'unknown';
  }

  getValue(): string {
    return this.hash;
  }

  getAlgorithm(): PasswordHashAlgorithm {
    return this.algorithm;
  }

  equals(other: PasswordHash): boolean {
    return this.hash === other.hash;
  }
}
