import { describe, expect, it } from 'vitest';
import { Sha256ApiKeySecretHasher } from '../../../src/infrastructure/crypto/Sha256ApiKeySecretHasher';
import { Sha256RefreshTokenHasher } from '../../../src/infrastructure/token/Sha256RefreshTokenHasher';

describe('Sha256RefreshTokenHasher', () => {
  it('ayni token icin deterministik hash uretir', async () => {
    const hasher = new Sha256RefreshTokenHasher();
    const a = await hasher.hash('token-abc');
    const b = await hasher.hash('token-abc');
    expect(a).toBe(b);
  });

  it('dogru token dogrulanir', async () => {
    const hasher = new Sha256RefreshTokenHasher();
    const hash = await hasher.hash('token-abc');
    expect(await hasher.verify('token-abc', hash)).toBe(true);
  });

  it('yanlis token dogrulanmaz', async () => {
    const hasher = new Sha256RefreshTokenHasher();
    const hash = await hasher.hash('token-abc');
    expect(await hasher.verify('token-xyz', hash)).toBe(false);
  });
});

describe('Sha256ApiKeySecretHasher', () => {
  it('ayni secret icin deterministik hash uretir', async () => {
    const hasher = new Sha256ApiKeySecretHasher();
    const a = await hasher.hash('secret-abc');
    const b = await hasher.hash('secret-abc');
    expect(a).toBe(b);
  });

  it('dogru secret dogrulanir, yanlis secret dogrulanmaz', async () => {
    const hasher = new Sha256ApiKeySecretHasher();
    const hash = await hasher.hash('secret-abc');
    expect(await hasher.verify('secret-abc', hash)).toBe(true);
    expect(await hasher.verify('secret-xyz', hash)).toBe(false);
  });
});
