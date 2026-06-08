import { PasswordPolicyService } from '@oserp-community/iam/domain/services/PasswordPolicyService';
import { PermissionEvaluator } from '@oserp-community/iam/domain/services/PermissionEvaluator';
import { PermissionCode } from '@oserp-community/iam/domain/value-objects/PermissionCode';
import { describe, expect, it } from 'vitest';

describe('PermissionEvaluator', () => {
  it('tam eslesme dogru doner', () => {
    const ev = new PermissionEvaluator(['catalog.product.read']);
    expect(ev.has(PermissionCode.create('catalog.product.read'))).toBe(true);
  });

  it('resource joker karakteri eslesir', () => {
    const ev = new PermissionEvaluator(['catalog.product.*']);
    expect(ev.hasCode('catalog.product.read')).toBe(true);
  });

  it('global joker eslesir', () => {
    const ev = new PermissionEvaluator(['*.*.*']);
    expect(ev.hasCode('iam.user.delete')).toBe(true);
  });

  it('eslesmeyen izin false doner', () => {
    const ev = new PermissionEvaluator(['catalog.product.read']);
    expect(ev.hasCode('iam.user.delete')).toBe(false);
  });
});

describe('PasswordPolicyService', () => {
  const svc = new PasswordPolicyService();

  it('gecerli parola true doner', () => {
    expect(svc.isValid('Abcdef12')).toBe(true);
  });

  it('gecersiz parola false doner', () => {
    expect(svc.isValid('weak')).toBe(false);
  });
});
