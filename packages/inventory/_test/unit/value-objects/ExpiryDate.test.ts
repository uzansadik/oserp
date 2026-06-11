import { ExpiryDate } from '@oserp-community/inventory/domain/value-objects/ExpiryDate';
import { describe, expect, it } from 'vitest';

describe('ExpiryDate', () => {
  it('none() hiç expiry yok', () => {
    const e = ExpiryDate.none();
    expect(e.hasExpiry()).toBe(false);
    expect(e.getDate()).toBeNull();
  });

  it('of(date) expiry tutar', () => {
    const d = new Date('2026-12-31');
    const e = ExpiryDate.of(d);
    expect(e.hasExpiry()).toBe(true);
    expect(e.getDate()?.toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('isExpiredAt doğru', () => {
    const e = ExpiryDate.of(new Date('2026-12-31'));
    expect(e.isExpiredAt(new Date('2026-06-01'))).toBe(false);
    expect(e.isExpiredAt(new Date('2026-12-31'))).toBe(true);
    expect(e.isExpiredAt(new Date('2027-01-01'))).toBe(true);
  });

  it('daysUntilExpiry hesaplar', () => {
    const e = ExpiryDate.of(new Date('2026-12-31T00:00:00Z'));
    expect(e.daysUntilExpiry(new Date('2026-12-30T00:00:00Z'))).toBe(1);
    expect(e.daysUntilExpiry(new Date('2027-01-10T00:00:00Z'))).toBe(-10);
  });

  it('sortKey: no-expiry > future > past', () => {
    const none = ExpiryDate.none();
    const future = ExpiryDate.of(new Date('2099-12-31'));
    const past = ExpiryDate.of(new Date('2020-01-01'));
    expect(past.sortKey()).toBeLessThan(future.sortKey());
    expect(future.sortKey()).toBeLessThan(none.sortKey());
  });
});
