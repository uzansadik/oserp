import type { RefreshTokenHasherPort } from '@oserp-community/iam/application/ports/RefreshTokenHasherPort';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Refresh token'lar için DETERMINISTIK SHA-256 hash'leyici.
 *
 * Refresh token'lar veritabanında hash'leriyle aranır (lookup), bu yüzden
 * argon2 gibi tuzlu/non-deterministik bir hash KULLANILAMAZ. Token yeterince
 * yüksek entropiye sahip (rastgele üretilir) olduğundan düz SHA-256 yeterlidir.
 */
export class Sha256RefreshTokenHasher implements RefreshTokenHasherPort {
  async hash(rawToken: string): Promise<string> {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async verify(rawToken: string, tokenHash: string): Promise<boolean> {
    const computed = Buffer.from(await this.hash(rawToken));
    const expected = Buffer.from(tokenHash);
    if (computed.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(computed, expected);
  }
}
