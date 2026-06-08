import { describe, expect, it } from 'vitest';
import { JwtTokenService } from '../../../src/infrastructure/token/JwtTokenService';

const SECRET = 'test-secret-key-1234567890';

describe('JwtTokenService', () => {
  it('imzalanan token uc parcali (header.body.signature) olur', async () => {
    const service = new JwtTokenService({ secret: SECRET });
    const token = await service.signAccessToken({ sub: 'user-1' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('imzalanan token dogrulanip claimleri geri verir', async () => {
    const service = new JwtTokenService({ secret: SECRET });
    const token = await service.signAccessToken({
      sub: 'user-1',
      companyId: 'company-1',
      permissions: ['user:read'],
    });

    const verified = await service.verifyAccessToken(token);
    expect(verified.sub).toBe('user-1');
    expect(verified.companyId).toBe('company-1');
    expect(verified.permissions).toEqual(['user:read']);
    expect(verified.expiresAt).toBeInstanceOf(Date);
  });

  it('opsiyonel claimler verilmezse companyId null permissions bos dizi olur', async () => {
    const service = new JwtTokenService({ secret: SECRET });
    const token = await service.signAccessToken({ sub: 'user-2' });
    const verified = await service.verifyAccessToken(token);
    expect(verified.companyId).toBeNull();
    expect(verified.permissions).toEqual([]);
  });

  it('yanlis anahtarla imzali token dogrulanmaz', async () => {
    const signer = new JwtTokenService({ secret: SECRET });
    const verifier = new JwtTokenService({ secret: 'baska-anahtar' });
    const token = await signer.signAccessToken({ sub: 'user-1' });
    await expect(verifier.verifyAccessToken(token)).rejects.toThrow('Invalid token signature');
  });

  it('suresi dolmus token reddedilir', async () => {
    const service = new JwtTokenService({ secret: SECRET, accessTokenTtlSeconds: -1 });
    const token = await service.signAccessToken({ sub: 'user-1' });
    await expect(service.verifyAccessToken(token)).rejects.toThrow('Token has expired');
  });

  it('bicimsiz token reddedilir', async () => {
    const service = new JwtTokenService({ secret: SECRET });
    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toThrow('Invalid token format');
  });

  it('secret bos ise ctor hata firlatir', () => {
    expect(() => new JwtTokenService({ secret: '' })).toThrow('secret is required');
  });
});
