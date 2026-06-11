import { describe, it, expect, beforeEach } from 'vitest';
import { ReservationService } from '@oserp-community/inventory/application/services/ReservationService';
import { InMemoryLotRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryLotRepository';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { FefoDispatchStrategy } from '@oserp-community/inventory/application/services/FefoDispatchStrategy';
import { CreateLotHandler } from '@oserp-community/inventory/application/handlers/LotHandlers';
import { SystemClock } from '@oserp-community/inventory/infrastructure/clock/SystemClock';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';

const PROD_1 = '11111111-1111-4111-8111-111111111111';

/**
 * Helper: bir ürün+location için InventoryLevel'ı oluştur ve onHand'i doldur.
 * Bu, gerçek dünyada `PostReceiptHandler` (StockMovement) ile yapılır; test'i
 * basit tutmak için doğrudan aggregate üzerinden yapıyoruz.
 */
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

describe('ReservationService (integration)', () => {
  let uow: InMemoryUnitOfWork;
  let lotRepo: InMemoryLotRepository;
  let service: ReservationService;
  let createLot: CreateLotHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    lotRepo = new InMemoryLotRepository();
    service = new ReservationService(
      uow,
      uow.reservations,
      lotRepo,
      uow.inventoryLevels,
      new FefoDispatchStrategy(),
      new SystemClock(),
    );
    createLot = new CreateLotHandler(lotRepo);
  });

  it('yeni reservation HELD durumunda oluşur, inventoryLevel.reserved artar', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');

    const result = await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', lotId: null, quantity: '30', uom: 'EA' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.reservation?.status).toBe('HELD');

    const level = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(level).not.toBeNull();
    expect(level!.getQuantity().getOnHand()).toBe('100');
    expect(level!.getQuantity().getReserved()).toBe('30');
  });

  it('ayni orderId icin ikinci reservation reddedilir', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'WH-A', quantity: '10', uom: 'EA' }],
    });
    const second = await service.createReservation({
      id: 'res_2',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'WH-A', quantity: '5', uom: 'EA' }],
    });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already exists/);
  });

  it('stok yetersizse reservation başarısız olur', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '5',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '5');
    const result = await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '100', uom: 'EA' },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Insufficient/);
  });

  it('release: reservation RELEASED, inventoryLevel.reserved azalır', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '40', uom: 'EA' },
      ],
    });
    const result = await service.releaseReservation({
      reservationId: 'res_1',
      reason: 'order_cancelled',
    });
    expect(result.ok).toBe(true);
    expect(result.reservation?.status).toBe('RELEASED');

    const level = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(level!.getQuantity().getReserved()).toBe('0');
  });

  it('commit: reservation COMMITTED, onHand ve reserved azalır', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '30', uom: 'EA' },
      ],
    });
    const result = await service.commitReservation({
      reservationId: 'res_1',
    });
    expect(result.ok).toBe(true);
    expect(result.reservation?.status).toBe('COMMITTED');

    const level = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(level!.getQuantity().getOnHand()).toBe('70');
    expect(level!.getQuantity().getReserved()).toBe('0');
  });

  it('idempotent release: zaten RELEASED reservation tekrar release OK', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '20', uom: 'EA' },
      ],
    });
    await service.releaseReservation({ reservationId: 'res_1' });
    const second = await service.releaseReservation({ reservationId: 'res_1' });
    expect(second.ok).toBe(true);
  });

  it('COMMITTED reservation release edilemez', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '20', uom: 'EA' },
      ],
    });
    await service.commitReservation({ reservationId: 'res_1' });
    const result = await service.releaseReservation({ reservationId: 'res_1' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/COMMITTED/);
  });

  it('FEFO: 2 lot varsa, erken expire olan once secilir', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '50',
      uom: 'EA',
      expiryDate: new Date('2030-12-31').toISOString(),
    });
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '80',
      uom: 'EA',
      expiryDate: new Date('2027-06-01').toISOString(),
    });
    await seedStock(uow, PROD_1, 'WH-A', '130');
    const result = await service.createReservation({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'WH-A', quantity: '60', uom: 'EA' },
      ],
    });
    expect(result.ok).toBe(true);
    // Lot 2 (erken expire)'den 60 cekildi → 80 → 20
    const agg = await lotRepo.loadAggregate(PROD_1, 'WH-A');
    const lots = agg!.getLots();
    const earlyLot = lots.find((l) => l.getExpiryDate().toJSON() === '2027-06-01T00:00:00.000Z');
    expect(earlyLot!.getQuantityOnHand()).toBe('20.000');
  });
});
