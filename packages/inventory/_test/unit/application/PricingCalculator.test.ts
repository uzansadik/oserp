import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { InMemoryExchangeRateProvider } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryExchangeRateProvider';
import { InMemoryPriceListRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryPriceListRepository';
import { PriceList } from '@oserp-community/inventory/domain/aggregates/PriceList';
import { PriceListEntry } from '@oserp-community/inventory/domain/entities/PriceListEntry';
import { DiscountType } from '@oserp-community/inventory/domain/value-objects/DiscountType';
import { ExchangeRate } from '@oserp-community/inventory/domain/value-objects/ExchangeRate';
import { PriceListScope } from '@oserp-community/inventory/domain/value-objects/PriceListScope';
import { PricingCalculatorImpl } from '@oserp-community/inventory/application/services/PricingCalculatorImpl';
import { describe, expect, it, beforeEach } from 'vitest';

describe('PricingCalculatorImpl', () => {
  let plRepo: InMemoryPriceListRepository;
  let fx: InMemoryExchangeRateProvider;
  let calc: PricingCalculatorImpl;

  beforeEach(() => {
    plRepo = new InMemoryPriceListRepository();
    fx = new InMemoryExchangeRateProvider();
    calc = new PricingCalculatorImpl(plRepo, fx);
  });

  it('GLOBAL liste döner, currency match', async () => {
    const list = makeList('pl_1', 'GLOBAL', PriceListScope.global());
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, Currency.of('USD'), DiscountType.none()));
    list.activate();
    await plRepo.save(list);

    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: null,
      customerGroupId: null,
      targetCurrency: 'USD',
      asOf: new Date('2026-06-01'),
    });
    expect(d).not.toBeNull();
    expect(d!.getUnitPrice()).toBe(100);
    expect(d!.getAppliedPriceListCode()).toBe('GLOBAL');
  });

  it('CUSTOMER listesi GLOBAL üzerinde kazanır', async () => {
    const globalList = makeList('pl_g', 'GLOBAL', PriceListScope.global());
    globalList.addEntry(makeEntry('eg', globalList.getId(), 'p1', 100, Currency.of('USD'), DiscountType.none()));
    globalList.activate();
    await plRepo.save(globalList);

    const custList = makeList('pl_c', 'CUST-1', PriceListScope.customer('cust_1'));
    custList.addEntry(makeEntry('ec', custList.getId(), 'p1', 80, Currency.of('USD'), DiscountType.none()));
    custList.activate();
    await plRepo.save(custList);

    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: 'cust_1',
      customerGroupId: null,
      targetCurrency: 'USD',
      asOf: new Date('2026-06-01'),
    });
    expect(d!.getUnitPrice()).toBe(80);
    expect(d!.getAppliedPriceListCode()).toBe('CUST-1');
  });

  it('CUSTOMER_GROUP > GLOBAL ama < CUSTOMER', async () => {
    const globalList = makeList('pl_g', 'GLOBAL', PriceListScope.global());
    globalList.addEntry(makeEntry('eg', globalList.getId(), 'p1', 100, Currency.of('USD'), DiscountType.none()));
    globalList.activate();
    await plRepo.save(globalList);

    const grpList = makeList('pl_grp', 'GROUP-VIP', PriceListScope.customerGroup('vip'));
    grpList.addEntry(makeEntry('egp', grpList.getId(), 'p1', 90, Currency.of('USD'), DiscountType.none()));
    grpList.activate();
    await plRepo.save(grpList);

    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: 'cust_99',
      customerGroupId: 'vip',
      targetCurrency: 'USD',
      asOf: new Date('2026-06-01'),
    });
    expect(d!.getUnitPrice()).toBe(90);
    expect(d!.getAppliedPriceListCode()).toBe('GROUP-VIP');
  });

  it('FX conversion: USD->TRY', async () => {
    const list = makeList('pl_1', 'GLOBAL', PriceListScope.global());
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, Currency.of('USD'), DiscountType.none()));
    list.activate();
    await plRepo.save(list);
    await fx.save(
      ExchangeRate.create({
        from: Currency.of('USD'),
        to: Currency.of('TRY'),
        rate: 35,
        effectiveFrom: new Date('2026-01-01'),
      }),
    );

    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: null,
      customerGroupId: null,
      targetCurrency: 'TRY',
      asOf: new Date('2026-06-01'),
    });
    expect(d!.getUnitPrice()).toBe(3500);
    expect(d!.getCurrency().getCode()).toBe('TRY');
  });

  it('PERCENTAGE discount uygular', async () => {
    const list = makeList('pl_1', 'GLOBAL', PriceListScope.global());
    list.addEntry(
      PriceListEntry.create({
        id: 'e1',
        priceListId: list.getId(),
        productId: 'p1',
        unitPrice: 100,
        currency: Currency.of('USD'),
        discount: DiscountType.percentage(),
        discountPercent: 25,
        minQuantity: 1,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        createdAt: new Date(),
      }),
    );
    list.activate();
    await plRepo.save(list);

    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: null,
      customerGroupId: null,
      targetCurrency: 'USD',
      asOf: new Date('2026-06-01'),
    });
    expect(d!.getUnitPrice()).toBe(75);
    expect(d!.getDiscountAmount()).toBe(25);
  });

  it('uygulanabilir liste yoksa null', async () => {
    const d = await calc.calculate({
      productId: 'p1',
      quantity: 1,
      customerId: 'cust_x',
      customerGroupId: null,
      targetCurrency: 'USD',
      asOf: new Date('2026-06-01'),
    });
    expect(d).toBeNull();
  });

  it('FX yoksa hata fırlatır', async () => {
    const list = makeList('pl_1', 'GLOBAL', PriceListScope.global());
    list.addEntry(makeEntry('e1', list.getId(), 'p1', 100, Currency.of('USD'), DiscountType.none()));
    list.activate();
    await plRepo.save(list);

    await expect(
      calc.calculate({
        productId: 'p1',
        quantity: 1,
        customerId: null,
        customerGroupId: null,
        targetCurrency: 'EUR',
        asOf: new Date('2026-06-01'),
      }),
    ).rejects.toThrow(/FX/);
  });
});

function makeList(id: string, code: string, scope: PriceListScope): PriceList {
  return PriceList.create({
    id,
    code,
    name: code,
    scope,
    baseCurrency: Currency.of('USD'),
    activeFrom: new Date('2026-01-01'),
  });
}

function makeEntry(
  id: string,
  listId: string,
  productId: string,
  unitPrice: number,
  currency: Currency,
  discount: DiscountType,
): PriceListEntry {
  return PriceListEntry.create({
    id,
    priceListId: listId,
    productId,
    unitPrice,
    currency,
    discount,
    minQuantity: 1,
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: null,
    createdAt: new Date(),
  });
}
