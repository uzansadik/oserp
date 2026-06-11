import { describe, it, expect, beforeEach } from 'vitest';
import { TransferService } from '@oserp-community/inventory/application/services/TransferService';
import { InMemoryLotRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryLotRepository';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { FefoDispatchStrategy } from '@oserp-community/inventory/application/services/FefoDispatchStrategy';
import { CreateLotHandler } from '@oserp-community/inventory/application/handlers/LotHandlers';
import { SystemClock } from '@oserp-community/inventory/infrastructure/clock/SystemClock';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { InventoryLevel } from '@oserp-community/inventory/domain/entities/InventoryLevel';

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

describe('TransferService (integration)', () => {
  let uow: InMemoryUnitOfWork;
  let lotRepo: InMemoryLotRepository;
  let service: TransferService;
  let createLot: CreateLotHandler;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    lotRepo = new InMemoryLotRepository();
    service = new TransferService(
      uow,
      uow.transfers,
      lotRepo,
      uow.inventoryLevels,
      new FefoDispatchStrategy(),
      new SystemClock(),
    );
    createLot = new CreateLotHandler(lotRepo);
  });

  it('createTransfer: DRAFT durumunda oluşur, stok hareketi yok', async () => {
    const result = await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [
        { productId: PROD_1, lotId: null, requestedQuantity: '30', uom: 'EA' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.transfer?.status).toBe('DRAFT');
    expect(result.transfer?.totalRequested).toBe('30');
  });

  it('createTransfer: aynı source/destination reddedilir', async () => {
    const result = await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-A',
      lines: [{ productId: PROD_1, requestedQuantity: '10', uom: 'EA' }],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/must differ/);
  });

  it('full lifecycle: dispatch → in_transit → receive → close, stok her iki lokasyonda doğru', async () => {
    // Setup: WH-A'da 100 EA lot
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');

    // 1) Create
    const created = await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [
        { productId: PROD_1, lotId: null, requestedQuantity: '40', uom: 'EA' },
      ],
    });
    expect(created.ok).toBe(true);

    // 2) Dispatch
    const dispatched = await service.dispatchTransfer({
      transferId: 'tr_1',
    });
    expect(dispatched.ok).toBe(true);
    expect(dispatched.transfer?.status).toBe('DISPATCHED');
    expect(dispatched.transfer?.totalDispatched).toBe('40');

    // Source InventoryLevel: onHand 100→60, inTransit 0→40
    const sourceLevel = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(sourceLevel!.getQuantity().getOnHand()).toBe('60');
    expect(sourceLevel!.getQuantity().getInTransit()).toBe('40');

    // 3) MarkInTransit
    const inTransit = await service.markInTransit('tr_1');
    expect(inTransit.ok).toBe(true);
    expect(inTransit.transfer?.status).toBe('IN_TRANSIT');

    // 4) Receive full
    const received = await service.receiveTransfer({
      transferId: 'tr_1',
      lineReceives: [{ productId: PROD_1, receivedQuantity: '40' }],
    });
    expect(received.ok).toBe(true);
    expect(received.transfer?.status).toBe('RECEIVED');
    expect(received.transfer?.totalReceived).toBe('40');
    expect(received.transfer?.totalVariance).toBe('0');

    // Source: inTransit 40→0
    const sourceAfter = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(sourceAfter!.getQuantity().getInTransit()).toBe('0');
    expect(sourceAfter!.getQuantity().getOnHand()).toBe('60');

    // Target: onHand 0→40
    const targetLevel = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-B'),
      null,
    );
    expect(targetLevel!.getQuantity().getOnHand()).toBe('40');

    // 5) Close
    const closed = await service.closeTransfer('tr_1');
    expect(closed.ok).toBe(true);
    expect(closed.transfer?.status).toBe('CLOSED');
  });

  it('partial receive: variance = dispatched - received, source.onHand düşer (kayıp)', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');

    await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [{ productId: PROD_1, requestedQuantity: '50', uom: 'EA' }],
    });
    await service.dispatchTransfer({ transferId: 'tr_1' });

    // Sadece 30 aldı, 20 kayıp
    const received = await service.receiveTransfer({
      transferId: 'tr_1',
      lineReceives: [{ productId: PROD_1, receivedQuantity: '30' }],
    });
    expect(received.ok).toBe(true);
    expect(received.transfer?.totalVariance).toBe('20');

    // Source: onHand 100→50 (dispatch) → 30 (variance scrap) = 30
    const sourceAfter = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-A'),
      null,
    );
    expect(sourceAfter!.getQuantity().getOnHand()).toBe('30');
    // Target: 30 aldı
    const targetLevel = await uow.inventoryLevels.findByComposite(
      ProductId.create(PROD_1),
      LocationRef.create('WH-B'),
      null,
    );
    expect(targetLevel!.getQuantity().getOnHand()).toBe('30');
  });

  it('dispatch: yetersiz stok reddedilir', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '10',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '10');
    await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [{ productId: PROD_1, requestedQuantity: '50', uom: 'EA' }],
    });
    const result = await service.dispatchTransfer({ transferId: 'tr_1' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Insufficient/);
  });

  it('cancel: sadece DRAFT', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [{ productId: PROD_1, requestedQuantity: '10', uom: 'EA' }],
    });
    const cancelled = await service.cancelTransfer({ transferId: 'tr_1', reason: 'test' });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.transfer?.status).toBe('CANCELLED');
  });

  it('cancel: dispatch sonrası reddedilir', async () => {
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '100',
      uom: 'EA',
    });
    await seedStock(uow, PROD_1, 'WH-A', '100');
    await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [{ productId: PROD_1, requestedQuantity: '10', uom: 'EA' }],
    });
    await service.dispatchTransfer({ transferId: 'tr_1' });
    const result = await service.cancelTransfer({ transferId: 'tr_1' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/only DRAFT/);
  });

  it('FEFO: 2 lot varsa erken expire olan once dispatch edilir', async () => {
    // Geç expire
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '50',
      uom: 'EA',
      expiryDate: new Date('2030-12-31').toISOString(),
    });
    // Erken expire
    await createLot.execute({
      productId: PROD_1,
      locationId: 'WH-A',
      quantity: '80',
      uom: 'EA',
      expiryDate: new Date('2027-06-01').toISOString(),
    });
    await seedStock(uow, PROD_1, 'WH-A', '130');

    await service.createTransfer({
      id: 'tr_1',
      sourceLocationId: 'WH-A',
      destinationLocationId: 'WH-B',
      lines: [{ productId: PROD_1, requestedQuantity: '60', uom: 'EA' }],
    });
    await service.dispatchTransfer({ transferId: 'tr_1' });

    // Erken expire lot'tan 60 cekildi → 80 → 20
    const agg = await lotRepo.loadAggregate(PROD_1, 'WH-A');
    const earlyLot = agg!.getLots().find(
      (l) => l.getExpiryDate().toJSON() === '2027-06-01T00:00:00.000Z',
    );
    expect(earlyLot!.getQuantityOnHand()).toBe('20.000');
  });
});
