import type {
  AccessTokenClaims,
  TokenServicePort,
  VerifiedAccessToken,
} from '@oserp-community/iam/application/ports/TokenServicePort';
import { createHmac, timingSafeEqual } from 'crypto';

export type JwtTokenServiceConfig = {
  /** HMAC imzalama anahtarı (HS256). */
  secret: string;
  /** Access token geçerlilik süresi (saniye). Varsayılan 15 dk. */
  accessTokenTtlSeconds?: number;
  /** Token'a yazılacak issuer (`iss`). */
  issuer?: string;
};

const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60;

type JwtPayload = {
  sub: string;
  companyId?: string;
  permissions?: string[];
  iat: number;
  exp: number;
  iss?: string;
};

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/**
 * Bağımlılıksız HS256 (HMAC-SHA256) JWT imzalama/doğrulama servisi.
 * Node `crypto` kullanır; harici jsonwebtoken paketine ihtiyaç duymaz.
 */
export class JwtTokenService implements TokenServicePort {
  private readonly secret: string;
  private readonly accessTtlSeconds: number;
  private readonly issuer: string | undefined;

  constructor(config: JwtTokenServiceConfig) {
    if (!config.secret) {
      throw new Error('JwtTokenService: secret is required');
    }
    this.secret = config.secret;
    this.accessTtlSeconds = config.accessTokenTtlSeconds ?? DEFAULT_ACCESS_TTL_SECONDS;
    this.issuer = config.issuer;
  }

  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: claims.sub,
      iat: nowSeconds,
      exp: nowSeconds + this.accessTtlSeconds,
    };
    if (claims.companyId !== undefined) {
      payload.companyId = claims.companyId;
    }
    if (claims.permissions !== undefined) {
      payload.permissions = claims.permissions;
    }
    if (this.issuer !== undefined) {
      payload.iss = this.issuer;
    }

    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    const [header, body, signature] = parts as [string, string, string];

    const expected = this.sign(`${header}.${body}`);
    const providedSig = Buffer.from(signature);
    const expectedSig = Buffer.from(expected);
    if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(base64UrlDecode(body)) as JwtPayload;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      throw new Error('Token has expired');
    }

    return {
      sub: payload.sub,
      companyId: payload.companyId ?? null,
      permissions: payload.permissions ?? [],
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
