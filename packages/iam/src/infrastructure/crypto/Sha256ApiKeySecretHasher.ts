import type { ApiKeySecretHasherPort } from '@oserp-community/iam/application/ports/ApiKeySecretHasherPort';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * API anahtarı secret'ları için DETERMINISTIK SHA-256 hash'leyici.
 *
 * Secret'lar yüksek entropili (randomBytes(32)) olarak üretildiğinden ve
 * doğrulama prefix ile bulunan kayıt üzerinden yapıldığından, brute-force
 * riski olmadan düz SHA-256 yeterlidir.
 */
export class Sha256ApiKeySecretHasher implements ApiKeySecretHasherPort {
  async hash(rawSecret: string): Promise<string> {
    return createHash('sha256').update(rawSecret).digest('hex');
  }

  async verify(rawSecret: string, secretHash: string): Promise<boolean> {
    const computed = Buffer.from(await this.hash(rawSecret));
    const expected = Buffer.from(secretHash);
    if (computed.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(computed, expected);
  }
}
