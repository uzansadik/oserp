import { CustomerRef, SalesOrderId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import {
  CreateOrderHandler,
  AddOrderLineHandler,
  ConfirmOrderHandler,
  CancelOrderHandler,
} from '@oserp-community/inventory/application/handlers/SalesOrderHandlers';
import { InMemorySalesOrderRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemorySalesOrderRepository';
import { describe, expect, it, beforeEach } from 'vitest';

describe('SalesOrder Handlers (integration)', () => {
  let repo: InMemorySalesOrderRepository;
  let createH: CreateOrderHandler;
  let addLineH: AddOrderLineHandler;
  let confirmH: ConfirmOrderHandler;
  let cancelH: CancelOrderHandler;

  beforeEach(() => {
    repo = new InMemorySalesOrderRepository();
    // Pricing service can be a no-op stub for these tests
    const pricingStub = { resolveUnitPrice: async () => { throw new Error('not used'); }, ensureCurrency: () => {} } as never;
    createH = new CreateOrderHandler(repo);
    addLineH = new AddOrderLineHandler(repo, pricingStub);
    confirmH = new ConfirmOrderHandler(repo);
    cancelH = new CancelOrderHandler(repo);
  });

  it('create → DRAFT, auto orderNumber', async () => {
    const id = await createH.execute({
      id: 'so_1',
      customerId: 'cust_1',
      currencyCode: 'USD',
    });
    const order = await repo.findById(SalesOrderId.of(id));
    expect(order).not.toBeNull();
    expect(order!.getStatus().getKind()).toBe('DRAFT');
    expect(order!.getOrderNumber().startsWith('SO-')).toBe(true);
  });

  it('add line with explicit price', async () => {
    await createH.execute({ id: 'so_1', customerId: 'cust_1', currencyCode: 'USD' });
    const lineId = await addLineH.execute({
      id: 'ol_1',
      orderId: 'so_1',
      productId: 'p1',
      productName: 'Test',
      productSku: 'SKU-1',
      quantity: '5',
      uom: 'EA',
      unitPrice: 10,
      currencyCode: 'USD',
    });
    expect(lineId).toBe('ol_1');
    const order = await repo.findById(SalesOrderId.of('so_1'));
    expect(order!.getLines().length).toBe(1);
    expect(order!.getTotal().getAmount()).toBe(50);
  });

  it('confirm happy path', async () => {
    await createH.execute({ id: 'so_1', customerId: 'cust_1', currencyCode: 'USD' });
    await addLineH.execute({
      id: 'ol_1',
      orderId: 'so_1',
      productId: 'p1',
      productName: 'P1',
      productSku: 'P1',
      quantity: '1',
      uom: 'EA',
      unitPrice: 5,
      currencyCode: 'USD',
    });
    await confirmH.execute('so_1');
    const order = await repo.findById(SalesOrderId.of('so_1'));
    expect(order!.getStatus().getKind()).toBe('CONFIRMED');
  });

  it('cancel', async () => {
    await createH.execute({ id: 'so_1', customerId: 'cust_1', currencyCode: 'USD' });
    await cancelH.execute('so_1', 'test reason');
    const order = await repo.findById(SalesOrderId.of('so_1'));
    expect(order!.getStatus().getKind()).toBe('CANCELLED');
  });
});
