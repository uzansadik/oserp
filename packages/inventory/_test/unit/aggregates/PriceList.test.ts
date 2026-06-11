import { PriceList } from '@oserp-community/inventory/domain/aggregates/PriceList';
import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { DiscountType } from '@oserp-community/inventory/domain/value-objects/DiscountType';
import { PriceListEntry } from '@oserp-community/inventory/domain/entities/PriceListEntry';
import { PriceListScope } from '@oserp-community/inventory/domain/value-objects/PriceListScope';
import { describe, expect, it } from 'vitest';

describe('PriceList', () => {
  it('DRAFT olarak oluşur, events yayınlar', () => {
    const list = PriceList.create({
      id: 'pl_1',
      code: 'GLOBAL-USD',
      name: 'Global USD list',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    expect(list.getStatus()).toBe('DRAFT');
    expect(list.getVersion()).toBe(1);
    expect(list.getEntries().length).toBe(0);
    const events = list.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'PriceListCreated')).toBe(true);
  });

  it('activate eder ve version artar', () => {
    const list = PriceList.create({
      id: 'pl_2',
      code: 'PL-2',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, new Date('2026-01-01'), null));
    list.activate();
    expect(list.getStatus()).toBe('ACTIVE');
    expect(list.getVersion()).toBe(3);
  });

  it('entry olmadan activate reddedilir', () => {
    const list = PriceList.create({
      id: 'pl_3',
      code: 'PL-3',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    expect(() => list.activate()).toThrow(/entries/);
  });

  it('addEntry aynı product + overlap window reddedilir', () => {
    const list = PriceList.create({
      id: 'pl_4',
      code: 'PL-4',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    const e1 = makeEntry('e1', list.getId(), 'p1', 100, new Date('2026-01-01'), null);
    list.addEntry(e1);
    const e2 = makeEntry('e2', list.getId(), 'p1', 110, new Date('2026-02-01'), null);
    expect(() => list.addEntry(e2)).toThrow(/overlap/);
  });

  it('addEntry farklı product kabul eder', () => {
    const list = PriceList.create({
      id: 'pl_5',
      code: 'PL-5',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, new Date('2026-01-01'), null));
    list.addEntry(makeEntry('e2', list.getId(), 'p2', 200, new Date('2026-01-01'), null));
    expect(list.getEntries().length).toBe(2);
  });

  it('addEntry currency mismatch reddedilir', () => {
    const list = PriceList.create({
      id: 'pl_6',
      code: 'PL-6',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    const e = PriceListEntry.create({
      id: 'e1',
      priceListId: list.getId(),
      productId: 'p1',
      unitPrice: 100,
      currency: Currency.of('EUR'),
      discount: DiscountType.none(),
      minQuantity: 1,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      createdAt: new Date(),
    });
    expect(() => list.addEntry(e)).toThrow(/currency/);
  });

  it('archive eder ve yeni entry reddedilir', () => {
    const list = PriceList.create({
      id: 'pl_7',
      code: 'PL-7',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, new Date('2026-01-01'), null));
    list.activate();
    list.archive();
    expect(list.getStatus()).toBe('ARCHIVED');
    expect(() => list.addEntry(makeEntry('e2', list.getId(), 'p2', 200, new Date('2026-01-01'), null))).toThrow(
      /archived/,
    );
  });

  it('findActiveEntryAt en yüksek minQuantity seçer', () => {
    const list = PriceList.create({
      id: 'pl_8',
      code: 'PL-8',
      name: 'X',
      scope: PriceListScope.global(),
      baseCurrency: Currency.of('USD'),
      activeFrom: new Date('2026-01-01'),
    });
    // Two tiered entries: tier1 (1+ units, $100) jan-only, tier2 (10+ units, $80) from feb
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, new Date('2026-01-01'), new Date('2026-01-31'), 1));
    list.addEntry(makeEntry('e2', list.getId(), 'p1', 80, new Date('2026-02-01'), null, 10));
    const at = new Date('2026-03-01');
    // At march, only e2 (tier2) is active, quantity 1 doesn't match e2 (10+),
    // quantity 10 matches e2
    const found1 = list.findActiveEntryAt('p1', at, 1);
    expect(found1).toBeNull();
    const found2 = list.findActiveEntryAt('p1', at, 10);
    expect(found2?.getId()).toBe('e2');
  });
});

function makeEntry(
  id: string,
  listId: string,
  productId: string,
  unitPrice: number,
  from: Date,
  to: Date | null,
  minQty = 1,
): PriceListEntry {
  return PriceListEntry.create({
    id,
    priceListId: listId,
    productId,
    unitPrice,
    currency: Currency.of('USD'),
    discount: DiscountType.none(),
    minQuantity: minQty,
    effectiveFrom: from,
    effectiveTo: to,
    createdAt: new Date(),
  });
}
