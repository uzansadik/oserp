import { Email } from '@oserp-community/iam/domain/value-objects/Email';
import { PermissionCode } from '@oserp-community/iam/domain/value-objects/PermissionCode';
import { RoleName } from '@oserp-community/iam/domain/value-objects/RoleName';
import { Username } from '@oserp-community/iam/domain/value-objects/Username';
import { describe, expect, it } from 'vitest';

describe('Email', () => {
  it('gecerli email kabul eder', () => {
    expect(Email.create('user@example.com').value).toBe('user@example.com');
  });

  it('gecersiz email icin hata firlatir', () => {
    expect(() => Email.create('not-an-email')).toThrow('Invalid email format');
  });

  it('ayni deger icin equals true doner', () => {
    expect(Email.equals(Email.create('a@b.com'), Email.create('a@b.com'))).toBe(true);
  });
});

describe('Username', () => {
  it('gecerli kullanici adi kabul eder', () => {
    expect(Username.create('johndoe').value).toBe('johndoe');
  });

  it('cok kisa kullanici adi icin hata firlatir', () => {
    expect(() => Username.create('ab')).toThrow('Username must be between 3 and 20 characters');
  });

  it('bos kullanici adi icin hata firlatir', () => {
    expect(() => Username.create('   ')).toThrow('Username cannot be empty');
  });
});

describe('RoleName', () => {
  it('gecerli rol adi kabul eder ve display degerini saklar', () => {
    const name = RoleName.create('admin', 'Yonetici');
    expect(name.value).toBe('admin');
    expect(name.display).toBe('Yonetici');
  });

  it('cok kisa rol adi icin hata firlatir', () => {
    expect(() => RoleName.create('ab', 'AB')).toThrow(
      'Role name must be between 3 and 50 characters',
    );
  });
});

describe('PermissionCode', () => {
  it('gecerli kodu parcalarina ayirir', () => {
    const code = PermissionCode.create('iam.user.read');
    expect(code.getModule().getValue()).toBe('iam');
    expect(code.getResource().getValue()).toBe('user');
    expect(code.getAction().getValue()).toBe('read');
  });

  it('kodu kucuk harfe normalize eder', () => {
    expect(PermissionCode.create('IAM.USER.READ').getValue()).toBe('iam.user.read');
  });

  it('hatali formatli kod icin hata firlatir', () => {
    expect(() => PermissionCode.create('iam.user')).toThrow(
      'Permission code must be in format: module.resource.action',
    );
  });

  it('desteklenmeyen aksiyon icin hata firlatir', () => {
    expect(() => PermissionCode.create('iam.user.fly')).toThrow('Unsupported permission action');
  });
});
