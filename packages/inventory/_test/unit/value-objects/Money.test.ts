import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { describe, expect, it } from 'vitest';

describe('Money', () => {
  it('of(amount, currency) minor units hesaplar', () => {
    const m = Money.of(99.99, 'USD');
    expect(m.getMinorUnits()).toBe(9999);
    expect(m.getAmount()).toBeCloseTo(99.99, 2);
  });

  it('zero()', () => {
    const m = Money.zero('USD');
    expect(m.isZero()).toBe(true);
    expect(m.getMinorUnits()).toBe(0);
  });

  it('add/subtract aynı currency', () => {
    const a = Money.of(10, 'USD');
    const b = Money.of(3.5, 'USD');
    expect(a.add(b).getAmount()).toBeCloseTo(13.5, 2);
    expect(a.subtract(b).getAmount()).toBeCloseTo(6.5, 2);
  });

  it('add currency mismatch reddedilir', () => {
    const a = Money.of(10, 'USD');
    const b = Money.of(10, 'EUR');
    expect(() => a.add(b)).toThrow(/mismatch/);
  });

  it('multiply', () => {
    const m = Money.of(100, 'USD');
    expect(m.multiply(0.20).getAmount()).toBe(20);
  });

  it('percentage 0-100', () => {
    const m = Money.of(100, 'USD');
    expect(m.percentage(15).getAmount()).toBe(15);
    expect(() => m.percentage(-1)).toThrow();
    expect(() => m.percentage(101)).toThrow();
  });

  it('JPY no minor unit', () => {
    const m = Money.of(100, 'JPY');
    expect(m.getMinorUnits()).toBe(100);
    expect(m.getAmount()).toBe(100);
  });

  it('equals', () => {
    expect(Money.of(10, 'USD').equals(Money.of(10, 'USD'))).toBe(true);
    expect(Money.of(10, 'USD').equals(Money.of(11, 'USD'))).toBe(false);
    expect(Money.of(10, 'USD').equals(Money.of(10, 'EUR'))).toBe(false);
  });

  it('isNegative', () => {
    expect(Money.of(-5, 'USD').isNegative()).toBe(true);
    expect(Money.of(0, 'USD').isNegative()).toBe(false);
  });
});
