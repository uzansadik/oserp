import { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { StockLevelChangedEvent } from '@oserp-community/inventory/domain/events/StockLevelChangedEvent';

describe('InventoryLevel', () => {
  it('sıfır ile başlar, status=OUT', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    expect(l.getQuantity().isZero()).toBe(true);
    expect(l.getQuantity().getOnHand()).toBe('0');
    expect(l.getVersion()).toBe(1);
  });

  it('applyReceipt onHand artırır, event üretir', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    l.applyReceipt('100');
    expect(l.getQuantity().getOnHand()).toBe('100');
    expect(l.getVersion()).toBe(2);
    const events = l.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(StockLevelChangedEvent);
  });

  it('applyIssue onHand azaltır', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    l.applyReceipt('100');
    l.applyIssue('30');
    expect(l.getQuantity().getOnHand()).toBe('70');
  });

  it('yetersiz stok için applyIssue hata fırlatır', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    l.applyReceipt('10');
    expect(() => l.applyIssue('20')).toThrow(/Insufficient/);
  });

  it('applyTransferOut: onHand azalır, inTransit artar', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    l.applyReceipt('100');
    l.applyTransferOut('40');
    expect(l.getQuantity().getOnHand()).toBe('60');
    expect(l.getQuantity().getInTransit()).toBe('40');
  });

  it('applyScrap onHand azaltır', () => {
    const l = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    l.applyReceipt('100');
    l.applyScrap('5');
    expect(l.getQuantity().getOnHand()).toBe('95');
  });

  it('composite key: product + location + lot', () => {
    const l1 = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-A'),
    });
    const l2 = InventoryLevel.create({
      productId: ProductId.create('11111111-1111-4111-8111-111111111111'),
      location: LocationRef.create('WH-B'),
    });
    expect(l1.getCompositeKey()).not.toBe(l2.getCompositeKey());
  });
});
