export type AccessTokenClaims = {
  sub: string;
  companyId?: string;
  permissions?: string[];
};

export type VerifiedAccessToken = {
  sub: string;
  companyId: string | null;
  permissions: string[];
  expiresAt: Date;
};

export interface TokenServicePort {
  signAccessToken(claims: AccessTokenClaims): Promise<string>;

  verifyAccessToken(token: string): Promise<VerifiedAccessToken>;
}
