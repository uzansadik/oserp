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

  it('tek basina * (wildcard permission) her seyi kapsar', () => {
    const ev = new PermissionEvaluator(['*']);
    expect(ev.hasCode('iam.user.create')).toBe(true);
    expect(ev.hasCode('sales.invoice.read')).toBe(true);
    expect(ev.hasCode('catalog.product.delete')).toBe(true);
  });

  it('wildcard henuz tanimlanmamis permissionlari da kapsar', () => {
    // Yeni bir context (sales) eklenip icine yeni bir permission kondugunda,
    // sistem kullanicisi (granted=['*']) bunu da otomatik alir — bu test
    // invariant'i korur: hasCode herhangi bir required string icin true.
    const ev = new PermissionEvaluator(['*']);
    expect(ev.hasCode('finance.ledger.close')).toBe(true);
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
