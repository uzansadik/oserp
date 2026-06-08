export class ApiKeySecretHash {
  private constructor(private readonly hash: string) {}

  static create(hash: string): ApiKeySecretHash {
    const normalized = hash?.trim();

    if (!normalized) {
      throw new Error('API key secret hash cannot be empty');
    }

    return new ApiKeySecretHash(normalized);
  }

  equals(other: ApiKeySecretHash): boolean {
    return this.hash === other.hash;
  }

  getValue(): string {
    return this.hash;
  }
}
