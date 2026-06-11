import { OrderLine } from '@oserp-community/inventory/domain/entities/OrderLine';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { describe, expect, it } from 'vitest';

function makeLine(qty: string, unit: number, discount = 0, tax = 0): OrderLine {
  return OrderLine.create({
    id: 'ol_1',
    salesOrderId: 'so_1',
    productId: 'p1',
    productName: 'Test',
    productSku: 'SKU-1',
    quantity: qty,
    uom: 'EA',
    unitPrice: Money.of(unit, 'USD'),
    discountPercent: discount,
    taxPercent: tax,
    notes: null,
    createdAt: new Date(),
  });
}

describe('OrderLine', () => {
  it('subtotal = unitPrice * qty', () => {
    const l = makeLine('3', 10);
    expect(l.getSubtotal().getAmount()).toBe(30);
  });

  it('discount 10% on 100 = 10', () => {
    const l = makeLine('1', 100, 10);
    expect(l.getDiscountAmount().getAmount()).toBe(10);
  });

  it('tax 20% on (100-10) = 18', () => {
    const l = makeLine('1', 100, 10, 20);
    expect(l.getTaxAmount().getAmount()).toBe(18);
  });

  it('line total = subtotal - discount + tax', () => {
    const l = makeLine('1', 100, 10, 20);
    expect(l.getLineTotal().getAmount()).toBe(108);
  });

  it('quantity <= 0 reddedilir', () => {
    expect(() => makeLine('0', 10)).toThrow();
    expect(() => makeLine('-1', 10)).toThrow();
  });

  it('discount/tax aralık dışı reddedilir', () => {
    expect(() => makeLine('1', 10, -1)).toThrow();
    expect(() => makeLine('1', 10, 0, 150)).toThrow();
  });

  it('line total: 5 adet x 99.99 USD = 499.95', () => {
    const l = makeLine('5', 99.99);
    expect(l.getLineTotal().getAmount()).toBeCloseTo(499.95, 2);
  });
});
