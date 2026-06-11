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
import { CreateReservationHandler, ReleaseReservationHandler, CommitReservationHandler, GetReservationHandler, ListReservationsHandler } from '@oserp-community/inventory/application/handlers/ReservationHandlers';

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

describe('Reservation Handlers (integration)', () => {
  let uow: InMemoryUnitOfWork;
  let lotRepo: InMemoryLotRepository;
  let service: ReservationService;
  let createReservation: CreateReservationHandler;
  let releaseReservation: ReleaseReservationHandler;
  let commitReservation: CommitReservationHandler;
  let getReservation: GetReservationHandler;
  let listReservations: ListReservationsHandler;
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
    createReservation = new CreateReservationHandler(service);
    releaseReservation = new ReleaseReservationHandler(service);
    commitReservation = new CommitReservationHandler(service);
    getReservation = new GetReservationHandler(uow.reservations);
    listReservations = new ListReservationsHandler(uow.reservations);
    createLot = new CreateLotHandler(lotRepo);
  });

  it('CreateReservationHandler: yeni reservation oluşturur', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');
    const result = await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        { productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.reservation?.id).toBe('res_1');
    expect(result.reservation?.status).toBe('HELD');
  });

  it('ReleaseReservationHandler: HELD → RELEASED', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    const result = await releaseReservation.execute({
      reservationId: 'res_1',
      reason: 'customer_changed_mind',
    });
    expect(result.ok).toBe(true);
    expect(result.reservation?.status).toBe('RELEASED');
  });

  it('CommitReservationHandler: HELD → COMMITTED', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    const result = await commitReservation.execute({ reservationId: 'res_1' });
    expect(result.ok).toBe(true);
    expect(result.reservation?.status).toBe('COMMITTED');
  });

  it('GetReservationHandler: id ile getirir', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '50',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '50');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    const result = await getReservation.execute('res_1');
    expect(result.ok).toBe(true);
    expect(result.reservation?.id).toBe('res_1');
  });

  it('GetReservationHandler: olmayan reservation 404', async () => {
    const result = await getReservation.execute('res_yok');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  it('ListReservationsHandler: tüm reservation\'ları listeler', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '100');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    await createReservation.execute({
      id: 'res_2',
      orderId: 'order_2',
      customerId: 'cust_2',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '15', uom: 'EA' }],
    });
    const result = await listReservations.execute({});
    expect(result.ok).toBe(true);
    expect(result.reservations).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('ListReservationsHandler: status filtresi', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '100');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    await createReservation.execute({
      id: 'res_2',
      orderId: 'order_2',
      customerId: 'cust_2',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '15', uom: 'EA' }],
    });
    await releaseReservation.execute({ reservationId: 'res_1' });
    const result = await listReservations.execute({ status: 'HELD' });
    expect(result.reservations).toHaveLength(1);
    expect(result.reservations![0]!.id).toBe('res_2');
  });

  it('ListReservationsHandler: activeOnly filtresi (sadece HELD)', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'MAIN',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'MAIN', '100');
    await createReservation.execute({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '20', uom: 'EA' }],
    });
    await createReservation.execute({
      id: 'res_2',
      orderId: 'order_2',
      customerId: 'cust_2',
      lines: [{ productId: PROD_1, locationId: 'MAIN', quantity: '15', uom: 'EA' }],
    });
    await commitReservation.execute({ reservationId: 'res_1' });
    const result = await listReservations.execute({ activeOnly: true });
    expect(result.reservations).toHaveLength(1);
    expect(result.reservations![0]!.id).toBe('res_2');
  });
});
