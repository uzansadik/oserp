import { CreateLotHandler, DispatchLotsHandler, ExpireLotsHandler } from '@oserp-community/inventory/application/handlers/LotHandlers';
import { FefoDispatchStrategy } from '@oserp-community/inventory/application/services/FefoDispatchStrategy';
import { InMemoryLotRepository } from '@oserp-community/inventory/infrastructure/persistance/repositories/InMemoryLotRepository';
import { describe, expect, it, beforeEach } from 'vitest';

describe('Lot Handlers (integration)', () => {
  let repo: InMemoryLotRepository;
  let createHandler: CreateLotHandler;
  let dispatchHandler: DispatchLotsHandler;
  let expireHandler: ExpireLotsHandler;

  beforeEach(() => {
    repo = new InMemoryLotRepository();
    createHandler = new CreateLotHandler(repo);
    dispatchHandler = new DispatchLotsHandler(repo, new FefoDispatchStrategy());
    expireHandler = new ExpireLotsHandler(repo);
  });

  it('create → aggregate oluşur', async () => {
    const id = await createHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      quantity: '100',
      uom: 'EA',
    });
    const agg = await repo.loadAggregate('p1', 'loc_1');
    expect(agg).not.toBeNull();
    expect(agg!.getLots().length).toBe(1);
    expect(agg!.getLots()[0]!.getId().getValue()).toBe(id);
  });

  it('FEFO dispatch 2 lot\'tan çekme', async () => {
    await createHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      quantity: '50',
      uom: 'EA',
      expiryDate: new Date('2026-12-31').toISOString(),
    });
    await createHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      quantity: '30',
      uom: 'EA',
      expiryDate: new Date('2026-06-01').toISOString(),
    });
    const r = await dispatchHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      requestedQuantity: '60',
      asOf: new Date('2026-03-01').toISOString(),
    });
    expect(r.totalAllocated).toBe('60.000');
    expect(r.remaining).toBe('0.000');
    expect(r.allocations[0]?.quantity).toBe('30.000'); // earliest expiry fully
    expect(r.allocations[1]?.quantity).toBe('30.000'); // then from second
  });

  it('expire lots past date', async () => {
    await createHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      quantity: '10',
      uom: 'EA',
      expiryDate: new Date('2025-01-01').toISOString(),
    });
    const r = await expireHandler.execute({ at: new Date('2026-06-01').toISOString() });
    expect(r.expiredCount).toBe(1);
  });

  it('expiryDate olmayan lots skip', async () => {
    await createHandler.execute({
      productId: 'p1',
      locationId: 'loc_1',
      quantity: '10',
      uom: 'EA',
      expiryDate: null,
    });
    const r = await expireHandler.execute({ at: new Date('2026-06-01').toISOString() });
    expect(r.expiredCount).toBe(0);
  });
});
