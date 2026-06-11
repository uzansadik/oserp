import { InvoiceStatus } from '@oserp-community/inventory/domain/value-objects/SalesStatus';
import { OrderStatus } from '@oserp-community/inventory/domain/value-objects/SalesStatus';
import { describe, expect, it } from 'vitest';

describe('OrderStatus', () => {
  it('DRAFT → CONFIRMED → FULFILLED → INVOICED → CLOSED', () => {
    let s = OrderStatus.draft();
    expect(s.canTransitionTo(OrderStatus.confirmed())).toBe(true);
    s = OrderStatus.confirmed();
    expect(s.canTransitionTo(OrderStatus.fulfilled())).toBe(true);
    s = OrderStatus.fulfilled();
    expect(s.canTransitionTo(OrderStatus.invoiced())).toBe(true);
    s = OrderStatus.invoiced();
    expect(s.canTransitionTo(OrderStatus.closed())).toBe(true);
    s = OrderStatus.closed();
    expect(s.isTerminal()).toBe(true);
  });

  it('DRAFT → CANCELLED', () => {
    expect(OrderStatus.draft().canTransitionTo(OrderStatus.cancelled())).toBe(true);
  });

  it('CONFIRMED → CANCELLED', () => {
    expect(OrderStatus.confirmed().canTransitionTo(OrderStatus.cancelled())).toBe(true);
  });

  it('INVOICED → CANCELLED reddedilir', () => {
    expect(OrderStatus.invoiced().canTransitionTo(OrderStatus.cancelled())).toBe(false);
  });

  it('idempotent', () => {
    expect(OrderStatus.draft().canTransitionTo(OrderStatus.draft())).toBe(true);
  });
});

describe('InvoiceStatus', () => {
  it('DRAFT → ISSUED → PAID → CLOSED', () => {
    let s = InvoiceStatus.draft();
    expect(s.canTransitionTo(InvoiceStatus.issued())).toBe(true);
    s = InvoiceStatus.issued();
    expect(s.canTransitionTo(InvoiceStatus.paid())).toBe(true);
    s = InvoiceStatus.paid();
    expect(s.canTransitionTo(InvoiceStatus.closed())).toBe(true);
    s = InvoiceStatus.closed();
    expect(s.isTerminal()).toBe(true);
  });

  it('ISSUED → PARTIALLY_PAID → PAID', () => {
    expect(InvoiceStatus.issued().canTransitionTo(InvoiceStatus.partiallyPaid())).toBe(true);
    expect(InvoiceStatus.partiallyPaid().canTransitionTo(InvoiceStatus.paid())).toBe(true);
  });

  it('ISSUED → VOID', () => {
    expect(InvoiceStatus.issued().canTransitionTo(InvoiceStatus.void())).toBe(true);
  });

  it('PAID → VOID reddedilir', () => {
    expect(InvoiceStatus.paid().canTransitionTo(InvoiceStatus.void())).toBe(false);
  });
});
