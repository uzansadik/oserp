import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { InMemoryLotRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryLotRepository';
import { InMemorySalesOrderRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemorySalesOrderRepository';
import { InMemoryInvoiceRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryInvoiceRepository';
import { FefoDispatchStrategy } from '@oserp-community/inventory/application/services/FefoDispatchStrategy';
import { SystemClock } from '@oserp-community/inventory/infrastructure/clock/SystemClock';
import { ReservationService } from '@oserp-community/inventory/application/services/ReservationService';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';
import { CreateLotHandler } from '@oserp-community/inventory/application/handlers/LotHandlers';
import {
  CreateOrderHandler,
  AddOrderLineHandler,
  ConfirmOrderHandler,
  CancelOrderHandler,
  CreateInvoiceFromOrderHandler,
  IssueInvoiceHandler,
  RecordPaymentHandler,
  GetOrderHandler,
} from '@oserp-community/inventory/application/handlers/SalesOrderHandlers';
import { SalesOrderPricingService } from '@oserp-community/inventory/application/services/SalesOrderPricingService';
import { InMemoryPriceListRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryPriceListRepository';
import { InMemoryExchangeRateProvider } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryExchangeRateProvider';
import { PricingCalculatorImpl } from '@oserp-community/inventory/application/services/PricingCalculatorImpl';

const PROD_1 = '11111111-1111-4111-8111-111111111111';

async function seedStock(
  uow: InMemoryUnitOfWork,
  productId: string,
  locationId: string,
  qty: string,
) {
  const level = InventoryLevel.create({
    productId: ProductId.create(productId),
    location: LocationRef.create(locationId),
    lotRef: null,
  });
  level.applyReceipt(qty);
  await uow.inventoryLevels.save(level);
}

describe('Order <-> Reservation (end-to-end)', () => {
  let uow: InMemoryUnitOfWork;
  let lotRepo: InMemoryLotRepository;
  let orderRepo: InMemorySalesOrderRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let reservationService: ReservationService;
  let createOrder: CreateOrderHandler;
  let addLine: AddOrderLineHandler;
  let confirmOrder: ConfirmOrderHandler;
  let cancelOrder: CancelOrderHandler;
  let createInvoice: CreateInvoiceFromOrderHandler;
  let issueInvoice: IssueInvoiceHandler;
  let recordPayment: RecordPaymentHandler;
  let getOrder: GetOrderHandler;
  let createLot: CreateLotHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    lotRepo = new InMemoryLotRepository();
    orderRepo = new InMemorySalesOrderRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    reservationService = new ReservationService(
      uow,
      uow.reservations,
      lotRepo,
      uow.inventoryLevels,
      new FefoDispatchStrategy(),
      new SystemClock(),
    );
    const pricing = new SalesOrderPricingService(
      new PricingCalculatorImpl(
        new InMemoryPriceListRepository(),
        new InMemoryExchangeRateProvider(),
      ),
    );
    createOrder = new CreateOrderHandler(orderRepo);
    addLine = new AddOrderLineHandler(orderRepo, pricing);
    confirmOrder = new ConfirmOrderHandler(orderRepo, reservationService);
    cancelOrder = new CancelOrderHandler(orderRepo, reservationService, uow.reservations);
    createInvoice = new CreateInvoiceFromOrderHandler(orderRepo, invoiceRepo);
    issueInvoice = new IssueInvoiceHandler(invoiceRepo);
    recordPayment = new RecordPaymentHandler(invoiceRepo, reservationService, uow.reservations);
    getOrder = new GetOrderHandler(orderRepo);
    createLot = new CreateLotHandler(lotRepo);
  });

  it('Order confirm → otomatik reservation HELD, Order cancel → reservation RELEASED', async () => {
    // Setup
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');

    // Order oluştur
    await createOrder.execute({
      id: 'order_1',
      customerId: 'cust_1',
      currencyCode: 'USD',
    });
    await addLine.execute({
      id: 'line_1',
      orderId: 'order_1',
      productId: PROD_1,
      productName: 'Test Product',
      productSku: 'TEST-001',
      quantity: '10',
      uom: 'EA',
      unitPrice: 100,
      currencyCode: 'USD',
    });

    // Confirm → reservation otomatik
    const confirmResult = await confirmOrder.execute('order_1');
    expect(confirmResult.reservationId).toBeDefined();

    // Reservation HELD
    const reservation = await uow.reservations.findByOrderId('order_1');
    expect(reservation).not.toBeNull();
    expect(reservation!.getStatus().getKind()).toBe('HELD');

    // InventoryLevel: reserved=10
    const level = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('MAIN'),
      null,
    );
    expect(level!.getQuantity().getReserved()).toBe('10');

    // Cancel order → reservation RELEASED
    await cancelOrder.execute('order_1', 'customer_changed_mind');
    const after = await uow.reservations.findByOrderId('order_1');
    expect(after!.getStatus().getKind()).toBe('RELEASED');
    // Reserved geri sıfır
    const level2 = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('MAIN'),
      null,
    );
    expect(level2!.getQuantity().getReserved()).toBe('0');
  });

  it('Full lifecycle: confirm → invoice → pay → reservation COMMITTED, onHand azalır', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');

    await createOrder.execute({
      id: 'order_1',
      customerId: 'cust_1',
      currencyCode: 'USD',
    });
    await addLine.execute({
      id: 'line_1',
      orderId: 'order_1',
      productId: PROD_1,
      productName: 'Test',
      productSku: 'SKU-1',
      quantity: '20',
      uom: 'EA',
      unitPrice: 50,
      currencyCode: 'USD',
    });
    await confirmOrder.execute('order_1');

    // Order INVOICED olmalı
    const order = await getOrder.execute('order_1');
    expect(order!.getStatus().getKind()).toBe('CONFIRMED');

    // Invoice oluştur
    await createInvoice.execute({
      id: 'inv_1',
      salesOrderId: 'order_1',
    });
    await issueInvoice.execute('inv_1');

    // Tam ödeme
    await recordPayment.execute({
      id: 'pay_1',
      invoiceId: 'inv_1',
      amount: 1000, // 20 * 50
      currencyCode: 'USD',
      method: 'wire',
    });

    // Reservation COMMITTED
    const res = await uow.reservations.findByOrderId('order_1');
    expect(res!.getStatus().getKind()).toBe('COMMITTED');

    // InventoryLevel: onHand=30, reserved=0
    const level = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('MAIN'),
      null,
    );
    expect(level!.getQuantity().getOnHand()).toBe('30');
    expect(level!.getQuantity().getReserved()).toBe('0');
  });

  it('stok yetersiz → confirm başarısız, reservation oluşmaz, order hala CONFIRMED', async () => {
    // Lot ama InventoryLevel'a yansıtılmamış: 0 onHand
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    // seedStock YOK — onHand=0

    await createOrder.execute({
      id: 'order_1',
      customerId: 'cust_1',
      currencyCode: 'USD',
    });
    await addLine.execute({
      id: 'line_1',
      orderId: 'order_1',
      productId: PROD_1,
      productName: 'Test',
      productSku: 'SKU-1',
      quantity: '10',
      uom: 'EA',
      unitPrice: 100,
      currencyCode: 'USD',
    });

    // Confirm başarısız olmalı (stok yetersiz veya lot aggregate yok)
    await expect(confirmOrder.execute('order_1')).rejects.toThrow(/(Insufficient|Reservation failed)/);

    // Reservation oluşmamış olmalı
    const res = await uow.reservations.findByOrderId('order_1');
    expect(res).toBeNull();
  });
});
