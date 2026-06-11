import {
  CreateInvoiceFromOrderHandler,
  IssueInvoiceHandler,
  RecordPaymentHandler,
} from '@oserp-community/inventory/application/handlers/SalesOrderHandlers';
import { AddOrderLineHandler, ConfirmOrderHandler, CreateOrderHandler } from '@oserp-community/inventory/application/handlers/SalesOrderHandlers';
import { InMemoryInvoiceRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryInvoiceRepository';
import { InMemorySalesOrderRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemorySalesOrderRepository';
import { describe, expect, it, beforeEach } from 'vitest';

describe('Invoice Handlers (integration)', () => {
  let orderRepo: InMemorySalesOrderRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let createInvoiceH: CreateInvoiceFromOrderHandler;
  let issueH: IssueInvoiceHandler;
  let payH: RecordPaymentHandler;

  beforeEach(() => {
    orderRepo = new InMemorySalesOrderRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    const pricingStub = { resolveUnitPrice: async () => { throw new Error('not used'); }, ensureCurrency: () => {} } as never;
    const createOrderH = new CreateOrderHandler(orderRepo);
    const addLineH = new AddOrderLineHandler(orderRepo, pricingStub);
    const confirmH = new ConfirmOrderHandler(orderRepo);
    createInvoiceH = new CreateInvoiceFromOrderHandler(orderRepo, invoiceRepo);
    issueH = new IssueInvoiceHandler(invoiceRepo);
    payH = new RecordPaymentHandler(invoiceRepo);

    return (async () => {
      // Seed: one confirmed order with one line
      await createOrderH.execute({ id: 'so_1', customerId: 'cust_1', currencyCode: 'USD' });
      await addLineH.execute({
        id: 'ol_1',
        orderId: 'so_1',
        productId: 'p1',
        productName: 'P1',
        productSku: 'P1',
        quantity: '1',
        uom: 'EA',
        unitPrice: 100,
        currencyCode: 'USD',
      });
      await confirmH.execute('so_1');
    })();
  });

  it('create from confirmed order → DRAFT invoice, order INVOICED', async () => {
    const invId = await createInvoiceH.execute({ id: 'inv_1', salesOrderId: 'so_1' });
    const found = await invoiceRepo.findById({ getValue: () => invId } as never);
    expect(found!.invoice.getStatus().getKind()).toBe('DRAFT');
    expect(found!.invoice.getTotal().getAmount()).toBe(100);
    const order = await orderRepo.findById({ getValue: () => 'so_1' } as never);
    expect(order!.getStatus().getKind()).toBe('INVOICED');
  });

  it('create from DRAFT order reddedilir', async () => {
    // need a DRAFT order
    await orderRepo.save(
      (await import('@oserp-community/inventory/domain/aggregates/SalesOrder')).SalesOrder.create({
        id: 'so_draft',
        orderNumber: 'SO-DRAFT',
        customer: { getCustomerId: () => 'c', getCustomerGroupId: () => null, equals: () => false, toJSON: () => ({}) } as never,
        currencyCode: 'USD',
      }),
    );
    await expect(createInvoiceH.execute({ id: 'inv_x', salesOrderId: 'so_draft' })).rejects.toThrow();
  });

  it('issue → record payment → PAID', async () => {
    const invId = await createInvoiceH.execute({ id: 'inv_1', salesOrderId: 'so_1' });
    await issueH.execute(invId);
    await payH.execute({
      id: 'pay_1',
      invoiceId: invId,
      amount: 100,
      currencyCode: 'USD',
      method: 'BANK',
    });
    const found = await invoiceRepo.findById({ getValue: () => invId } as never);
    expect(found!.invoice.getStatus().getKind()).toBe('PAID');
    expect(found!.invoice.getPayments().length).toBe(1);
  });
});
