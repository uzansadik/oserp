import { CustomerRef, SalesOrderId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { OrderLine } from '@oserp-community/inventory/domain/entities/OrderLine';
import { SalesOrder } from '@oserp-community/inventory/domain/aggregates/SalesOrder';
import { describe, expect, it } from 'vitest';

function makeOrder() {
  return SalesOrder.create({
    id: 'so_1',
    orderNumber: 'SO-1',
    customer: CustomerRef.of('cust_1'),
    currencyCode: 'USD',
  });
}

function addLine(order: SalesOrder, id: string, qty: string, unit: number): OrderLine {
  const line = OrderLine.create({
    id,
    salesOrderId: order.getId().getValue(),
    productId: 'p1',
    productName: 'P1',
    productSku: 'P1',
    quantity: qty,
    uom: 'EA',
    unitPrice: Money.of(unit, 'USD'),
    discountPercent: 0,
    taxPercent: 0,
    notes: null,
    createdAt: new Date(),
  });
  order.addLine(line);
  return line;
}

describe('SalesOrder', () => {
  it('create DRAFT', () => {
    const o = makeOrder();
    expect(o.getStatus().getKind()).toBe('DRAFT');
    expect(o.getVersion()).toBe(1);
    const events = o.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'OrderCreated')).toBe(true);
  });

  it('addLine → DRAFT, event yayınlar', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '10', 5);
    expect(o.getLines().length).toBe(1);
    expect(o.getTotal().getAmount()).toBe(50);
    const events = o.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'OrderLineAdded')).toBe(true);
  });

  it('addLine currency mismatch reddedilir', () => {
    const o = makeOrder();
    const line = OrderLine.create({
      id: 'ol_x',
      salesOrderId: o.getId().getValue(),
      productId: 'p1',
      productName: 'P1',
      productSku: 'P1',
      quantity: '10',
      uom: 'EA',
      unitPrice: Money.of(5, 'EUR'),
      discountPercent: 0,
      taxPercent: 0,
      notes: null,
      createdAt: new Date(),
    });
    expect(() => o.addLine(line)).toThrow(/currency/);
  });

  it('confirm → CONFIRMED, event', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '10', 5);
    o.confirm();
    expect(o.getStatus().getKind()).toBe('CONFIRMED');
    const events = o.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'OrderConfirmed')).toBe(true);
  });

  it('confirm without lines reddedilir', () => {
    const o = makeOrder();
    expect(() => o.confirm()).toThrow(/lines/);
  });

  it('confirm non-DRAFT reddedilir', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    o.confirm();
    // addLine should be rejected on non-DRAFT — wrap in helper that catches
    let threw = false;
    try {
      addLine(o, 'ol_2', '1', 1);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    // Also: re-confirm a CONFIRMED order should fail
    expect(() => o.confirm()).toThrow();
  });

  it('fulfill → FULFILLED', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    o.confirm();
    o.fulfill();
    expect(o.getStatus().getKind()).toBe('FULFILLED');
  });

  it('cancel DRAFT → CANCELLED', () => {
    const o = makeOrder();
    o.cancel('test');
    expect(o.getStatus().getKind()).toBe('CANCELLED');
  });

  it('cancel INVOICED reddedilir', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    o.confirm();
    o.fulfill();
    o.markInvoiced();
    expect(() => o.cancel()).toThrow();
  });

  it('markInvoiced from CONFIRMED/FULFILLED', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    o.confirm();
    o.markInvoiced();
    expect(o.getStatus().getKind()).toBe('INVOICED');
  });

  it('close → CLOSED', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    o.confirm();
    o.fulfill();
    o.markInvoiced();
    o.close();
    expect(o.getStatus().getKind()).toBe('CLOSED');
    expect(o.getStatus().isTerminal()).toBe(true);
  });

  it('removeLine → line silinir', () => {
    const o = makeOrder();
    addLine(o, 'ol_1', '1', 1);
    addLine(o, 'ol_2', '1', 1);
    o.removeLine('ol_1');
    expect(o.getLines().length).toBe(1);
  });

  it('getSubtotal/getTotalDiscount/getTotalTax/getTotal doğru', () => {
    const o = makeOrder();
    OrderLine.create({
      id: 'ol_1',
      salesOrderId: o.getId().getValue(),
      productId: 'p1',
      productName: 'P1',
      productSku: 'P1',
      quantity: '10',
      uom: 'EA',
      unitPrice: Money.of(100, 'USD'),
      discountPercent: 10,
      taxPercent: 20,
      notes: null,
      createdAt: new Date(),
    });
    o.addLine(
      OrderLine.create({
        id: 'ol_1',
        salesOrderId: o.getId().getValue(),
        productId: 'p1',
        productName: 'P1',
        productSku: 'P1',
        quantity: '10',
        uom: 'EA',
        unitPrice: Money.of(100, 'USD'),
        discountPercent: 10,
        taxPercent: 20,
        notes: null,
        createdAt: new Date(),
      }),
    );
    expect(o.getSubtotal().getAmount()).toBe(1000);
    expect(o.getTotalDiscount().getAmount()).toBe(100);
    expect(o.getTotalTax().getAmount()).toBe(180); // 20% of (1000-100) = 180
    expect(o.getTotal().getAmount()).toBe(1080);
  });
});
