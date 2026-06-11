import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { ExchangeRate } from '@oserp-community/inventory/domain/value-objects/ExchangeRate';
import { describe, expect, it } from 'vitest';

describe('ExchangeRate', () => {
  it('create geçerli rate kabul eder', () => {
    const r = ExchangeRate.create({
      from: Currency.of('TRY'),
      to: Currency.of('USD'),
      rate: 0.028,
      effectiveFrom: new Date('2026-01-01'),
    });
    expect(r.getRate()).toBe(0.028);
    expect(r.getSource()).toBe('MANUAL');
  });

  it('negatif/zero rate reddedilir', () => {
    expect(() =>
      ExchangeRate.create({
        from: Currency.of('TRY'),
        to: Currency.of('USD'),
        rate: 0,
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).toThrow();
    expect(() =>
      ExchangeRate.create({
        from: Currency.of('TRY'),
        to: Currency.of('USD'),
        rate: -0.01,
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).toThrow();
  });

  it('aynı para reddedilir', () => {
    expect(() =>
      ExchangeRate.create({
        from: Currency.of('USD'),
        to: Currency.of('USD'),
        rate: 1,
        effectiveFrom: new Date('2026-01-01'),
      }),
    ).toThrow();
  });

  it('isActiveAt doğru çalışır', () => {
    const r = ExchangeRate.create({
      from: Currency.of('TRY'),
      to: Currency.of('USD'),
      rate: 0.028,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-12-31'),
    });
    expect(r.isActiveAt(new Date('2026-06-01'))).toBe(true);
    expect(r.isActiveAt(new Date('2025-12-31'))).toBe(false);
    expect(r.isActiveAt(new Date('2027-01-01'))).toBe(false);
  });

  it('convert 4 ondalık yuvarlar', () => {
    const r = ExchangeRate.create({
      from: Currency.of('TRY'),
      to: Currency.of('USD'),
      rate: 0.028571,
      effectiveFrom: new Date('2026-01-01'),
    });
    expect(r.convert(100)).toBe(2.8571);
  });
});
