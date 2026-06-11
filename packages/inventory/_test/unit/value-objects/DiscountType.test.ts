import { DiscountType } from '@oserp-community/inventory/domain/value-objects/DiscountType';
import { describe, expect, it } from 'vitest';

describe('DiscountType', () => {
  describe('NONE', () => {
    it('list price değişmez', () => {
      const r = DiscountType.none().apply(100, {});
      expect(r.finalUnitPrice).toBe(100);
      expect(r.discountApplied).toBe(0);
      expect(r.kind).toBe('NONE');
    });
  });

  describe('PERCENTAGE', () => {
    it('10% off: 100 -> 90', () => {
      const r = DiscountType.percentage().apply(100, { percent: 10 });
      expect(r.finalUnitPrice).toBe(90);
      expect(r.discountApplied).toBe(10);
    });

    it('100% off: 100 -> 0', () => {
      const r = DiscountType.percentage().apply(100, { percent: 100 });
      expect(r.finalUnitPrice).toBe(0);
    });

    it('aralık dışı reddedilir', () => {
      expect(() => DiscountType.percentage().apply(100, { percent: -1 })).toThrow();
      expect(() => DiscountType.percentage().apply(100, { percent: 150 })).toThrow();
    });
  });

  describe('FIXED_AMOUNT', () => {
    it('15 off: 100 -> 85', () => {
      const r = DiscountType.fixedAmount().apply(100, { fixedAmount: 15 });
      expect(r.finalUnitPrice).toBe(85);
      expect(r.discountApplied).toBe(15);
    });

    it('listeyi aşarsa reddedilir', () => {
      expect(() => DiscountType.fixedAmount().apply(100, { fixedAmount: 150 })).toThrow();
    });

    it('negatif reddedilir', () => {
      expect(() => DiscountType.fixedAmount().apply(100, { fixedAmount: -1 })).toThrow();
    });
  });

  describe('OVERRIDE_PRICE', () => {
    it('79.99 override: 100 -> 79.99', () => {
      const r = DiscountType.overridePrice().apply(100, { overridePrice: 79.99 });
      expect(r.finalUnitPrice).toBe(79.99);
      expect(r.discountApplied).toBe(20.01);
    });

    it('negatif reddedilir', () => {
      expect(() => DiscountType.overridePrice().apply(100, { overridePrice: -1 })).toThrow();
    });
  });
});
