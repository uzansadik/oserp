import { Password } from '@oserp-community/iam/domain/value-objects/Password';
import { describe, expect, it } from 'vitest';

describe('Password', () => {
  it('gecerli parola olusturur', () => {
    const password = Password.create('Abcdef12');
    expect(password.getValue()).toBe('Abcdef12');
  });

  it('bos parola icin hata firlatir', () => {
    expect(() => Password.create('')).toThrow('Password cannot be empty');
  });

  it('cok kisa parola icin hata firlatir', () => {
    expect(() => Password.create('Ab1')).toThrow('Password must be at least 8 characters');
  });

  it('kucuk harf yoksa hata firlatir', () => {
    expect(() => Password.create('ABCDEF12')).toThrow(
      'Password must contain at least one lowercase letter',
    );
  });

  it('buyuk harf yoksa hata firlatir', () => {
    expect(() => Password.create('abcdef12')).toThrow(
      'Password must contain at least one uppercase letter',
    );
  });

  it('rakam yoksa hata firlatir', () => {
    expect(() => Password.create('Abcdefgh')).toThrow('Password must contain at least one digit');
  });
});
