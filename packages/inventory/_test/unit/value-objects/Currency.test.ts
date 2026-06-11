import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { describe, expect, it } from 'vitest';

describe('Currency', () => {
  describe('of', () => {
    it('ISO-4217 3 harfli kod kabul eder', () => {
      const c = Currency.of('USD');
      expect(c.getCode()).toBe('USD');
      expect(c.getMinorUnit()).toBe(2);
    });

    it('JPY minor unit 0 olur', () => {
      expect(Currency.of('JPY').getMinorUnit()).toBe(0);
    });

    it('KWD minor unit 3 olur', () => {
      expect(Currency.of('KWD').getMinorUnit()).toBe(3);
    });

    it('3 harfli olmayan reddedilir', () => {
      expect(() => Currency.of('US')).toThrow();
      expect(() => Currency.of('usd')).toThrow();
      expect(() => Currency.of('USDD')).toThrow();
    });

    it('tryOf invalid için null döner', () => {
      expect(Currency.tryOf('XX')).toBeNull();
      expect(Currency.tryOf('USD')).not.toBeNull();
    });
  });

  describe('toMinorUnits / fromMinorUnits', () => {
    it('USD 9.99 -> 999 cents', () => {
      const usd = Currency.of('USD');
      expect(usd.toMinorUnits(9.99)).toBe(999);
      expect(usd.fromMinorUnits(999)).toBeCloseTo(9.99, 2);
    });

    it('JPY 100 -> 100 (no minor)', () => {
      const jpy = Currency.of('JPY');
      expect(jpy.toMinorUnits(100)).toBe(100);
      expect(jpy.fromMinorUnits(100)).toBe(100);
    });
  });

  describe('equals', () => {
    it('aynı kod eşit', () => {
      expect(Currency.of('EUR').equals(Currency.of('EUR'))).toBe(true);
    });
    it('farklı kod eşit değil', () => {
      expect(Currency.of('EUR').equals(Currency.of('USD'))).toBe(false);
    });
  });
});
