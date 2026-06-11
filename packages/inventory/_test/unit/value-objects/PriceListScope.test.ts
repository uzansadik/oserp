import { PriceListScope } from '@oserp-community/inventory/domain/value-objects/PriceListScope';
import { describe, expect, it } from 'vitest';

describe('PriceListScope', () => {
  it('global scope oluşturur', () => {
    const s = PriceListScope.global();
    expect(s.getKind()).toBe('GLOBAL');
    expect(s.getTargetId()).toBeNull();
  });

  it('customer scope customerId olmadan reddedilir', () => {
    expect(() => PriceListScope.customer('')).toThrow();
  });

  it('customer scope doğru oluşur', () => {
    const s = PriceListScope.customer('cust_1');
    expect(s.getKind()).toBe('CUSTOMER');
    expect(s.getTargetId()).toBe('cust_1');
  });

  it('customer group scope oluşur', () => {
    const s = PriceListScope.customerGroup('vip');
    expect(s.getKind()).toBe('CUSTOMER_GROUP');
    expect(s.getTargetId()).toBe('vip');
  });

  it('CUSTOMER > GROUP > GLOBAL precedence', () => {
    expect(PriceListScope.customer('x').isHigherPrecedenceThan(PriceListScope.customerGroup('v'))).toBe(true);
    expect(PriceListScope.customerGroup('v').isHigherPrecedenceThan(PriceListScope.global())).toBe(true);
    expect(PriceListScope.global().isHigherPrecedenceThan(PriceListScope.customer('x'))).toBe(false);
  });

  it('matchesScope aynı kind+target eşleşir', () => {
    const a = PriceListScope.customer('x');
    const b = PriceListScope.customer('x');
    const c = PriceListScope.customer('y');
    expect(a.matchesScope(b)).toBe(true);
    expect(a.matchesScope(c)).toBe(false);
  });
});
