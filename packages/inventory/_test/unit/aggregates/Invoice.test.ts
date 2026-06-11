import { Invoice } from '@oserp-community/inventory/domain/aggregates/Invoice';
import { InvoiceLine } from '@oserp-community/inventory/domain/entities/InvoiceLine';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { describe, expect, it } from 'vitest';

function makeInvoice(total: number = 100): Invoice {
  const line = InvoiceLine.create({
    id: 'invl_1',
    invoiceId: 'inv_1',
    orderLineId: 'ol_1',
    productId: 'p1',
    productName: 'P1',
    productSku: 'P1',
    quantity: '1',
    uom: 'EA',
    unitPrice: Money.of(total, 'USD'),
    discountPercent: 0,
    taxPercent: 0,
    notes: null,
    createdAt: new Date(),
  });
  return Invoice.create({
    id: 'inv_1',
    invoiceNumber: 'INV-1',
    salesOrderId: 'so_1',
    customerId: 'cust_1',
    currencyCode: 'USD',
    lines: [line],
  });
}

describe('Invoice', () => {
  it('create DRAFT', () => {
    const i = makeInvoice();
    expect(i.getStatus().getKind()).toBe('DRAFT');
    expect(i.getTotal().getAmount()).toBe(100);
    const events = i.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'InvoiceCreated')).toBe(true);
  });

  it('create without lines reddedilir', () => {
    expect(() =>
      Invoice.create({
        id: 'inv_x',
        invoiceNumber: 'INV-X',
        salesOrderId: 'so_x',
        customerId: 'cust_x',
        currencyCode: 'USD',
        lines: [],
      }),
    ).toThrow(/lines/);
  });

  it('issue DRAFT → ISSUED', () => {
    const i = makeInvoice();
    i.issue();
    expect(i.getStatus().getKind()).toBe('ISSUED');
  });

  it('recordPayment partial → PARTIALLY_PAID', () => {
    const i = makeInvoice(100);
    i.issue();
    i.recordPayment({ id: 'pay_1', amount: Money.of(40, 'USD'), method: 'CARD' });
    expect(i.getStatus().getKind()).toBe('PARTIALLY_PAID');
    expect(i.getPaidAmount().getAmount()).toBe(40);
    expect(i.getOutstandingAmount().getAmount()).toBe(60);
  });

  it('recordPayment full → PAID', () => {
    const i = makeInvoice(100);
    i.issue();
    i.recordPayment({ id: 'pay_1', amount: Money.of(100, 'USD'), method: 'BANK' });
    expect(i.getStatus().getKind()).toBe('PAID');
    expect(i.isFullyPaid()).toBe(true);
  });

  it('recordPayment overpayment → PAID', () => {
    const i = makeInvoice(100);
    i.issue();
    i.recordPayment({ id: 'pay_1', amount: Money.of(150, 'USD'), method: 'CASH' });
    expect(i.getStatus().getKind()).toBe('PAID');
  });

  it('recordPayment currency mismatch reddedilir', () => {
    const i = makeInvoice(100);
    i.issue();
    expect(() => i.recordPayment({ id: 'pay_1', amount: Money.of(50, 'EUR'), method: 'CASH' })).toThrow(/Payment currency/);
  });

  it('void ISSUED → VOID', () => {
    const i = makeInvoice();
    i.issue();
    i.voidInvoice('test');
    expect(i.getStatus().getKind()).toBe('VOID');
  });

  it('void PAID reddedilir', () => {
    const i = makeInvoice(100);
    i.issue();
    i.recordPayment({ id: 'p', amount: Money.of(100, 'USD'), method: 'CASH' });
    expect(() => i.voidInvoice()).toThrow();
  });

  it('close PAID → CLOSED', () => {
    const i = makeInvoice(100);
    i.issue();
    i.recordPayment({ id: 'p', amount: Money.of(100, 'USD'), method: 'CASH' });
    i.close();
    expect(i.getStatus().getKind()).toBe('CLOSED');
    expect(i.getStatus().isTerminal()).toBe(true);
  });

  it('totals', () => {
    const line = InvoiceLine.create({
      id: 'invl_1',
      invoiceId: 'inv_1',
      orderLineId: 'ol_1',
      productId: 'p1',
      productName: 'P1',
      productSku: 'P1',
      quantity: '2',
      uom: 'EA',
      unitPrice: Money.of(50, 'USD'),
      discountPercent: 10,
      taxPercent: 20,
      notes: null,
      createdAt: new Date(),
    });
    const i = Invoice.create({
      id: 'inv_1',
      invoiceNumber: 'INV-1',
      salesOrderId: 'so_1',
      customerId: 'cust_1',
      currencyCode: 'USD',
      lines: [line],
    });
    expect(i.getSubtotal().getAmount()).toBe(100);
    expect(i.getTotalDiscount().getAmount()).toBe(10);
    expect(i.getTotalTax().getAmount()).toBe(18); // 20% of 90
    expect(i.getTotal().getAmount()).toBe(108);
  });
});
