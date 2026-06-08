export interface RefreshTokenHasherPort {
  hash(rawToken: string): Promise<string>;

  verify(rawToken: string, tokenHash: string): Promise<boolean>;
}
