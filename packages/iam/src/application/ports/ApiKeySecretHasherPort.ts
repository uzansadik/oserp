export interface ApiKeySecretHasherPort {
  hash(rawSecret: string): Promise<string>;

  verify(rawSecret: string, secretHash: string): Promise<boolean>;
}
