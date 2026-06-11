import { ExpiryDate } from '@oserp-community/inventory/domain/value-objects/ExpiryDate';
import { Lot } from '@oserp-community/inventory/domain/entities/Lot';
import { LotAggregate } from '@oserp-community/inventory/domain/aggregates/LotAggregate';
import { LotId } from '@oserp-community/inventory/domain/value-objects/LotId';
import { LotStatus } from '@oserp-community/inventory/domain/value-objects/LotStatus';
import { describe, expect, it } from 'vitest';

function makeLot(id: string, qty: string, expiry: Date | null): Lot {
  return Lot.create({
    id: LotId.of(id),
    productId: 'p1',
    locationId: 'loc_1',
    quantityOnHand: qty,
    uom: 'EA',
    status: LotStatus.available(),
    expiryDate: expiry ? ExpiryDate.of(expiry) : ExpiryDate.none(),
    mfgDate: null,
    receivedAt: new Date('2026-01-01'),
    supplierLotCode: null,
    serialNumbers: [],
    notes: null,
    version: 1,
  });
}

describe('LotAggregate', () => {
  it('empty aggregate oluşur', () => {
    const agg = LotAggregate.empty('p1', 'loc_1');
    expect(agg.getLots().length).toBe(0);
    expect(agg.getTotalAvailable(new Date())).toBe('0.000');
  });

  it('addLot event yayınlar', () => {
    const agg = LotAggregate.empty('p1', 'loc_1');
    const lot = makeLot('lot_1', '100', new Date('2026-12-31'));
    const next = agg.addLot(lot);
    const events = next.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'LotCreated')).toBe(true);
  });

  it('addLot productId mismatch reddedilir', () => {
    const agg = LotAggregate.empty('p1', 'loc_1');
    const lot = Lot.create({
      id: LotId.of('lot_2'),
      productId: 'p2',
      locationId: 'loc_1',
      quantityOnHand: '10',
      uom: 'EA',
      status: LotStatus.available(),
      expiryDate: ExpiryDate.none(),
      mfgDate: null,
      receivedAt: new Date(),
      supplierLotCode: null,
      serialNumbers: [],
      notes: null,
      version: 1,
    });
    expect(() => agg.addLot(lot)).toThrow(/productId/);
  });

  it('FEFO dispatch: önce en yakın SKT', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    agg = agg.addLot(makeLot('lot_late', '100', new Date('2027-01-01')));
    agg = agg.addLot(makeLot('lot_soon', '50', new Date('2026-06-01')));
    agg = agg.addLot(makeLot('lot_mid', '200', new Date('2026-09-01')));

    // Request 200: should pull 50 from lot_soon + 150 from lot_mid
    const r = agg.dispatch('200', new Date('2026-03-01'));
    expect(r.allocations.length).toBe(2);
    expect(r.allocations[0]?.lot.getId().getValue()).toBe('lot_soon');
    expect(r.allocations[0]?.quantity).toBe('50.000');
    expect(r.allocations[1]?.lot.getId().getValue()).toBe('lot_mid');
    expect(r.allocations[1]?.quantity).toBe('150.000');
    expect(r.remaining).toBe('0.000');
  });

  it('dispatch yetersiz stok → remaining pozitif', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    agg = agg.addLot(makeLot('lot_a', '30', new Date('2026-06-01')));
    const r = agg.dispatch('100', new Date('2026-03-01'));
    expect(r.totalAllocated).toBe('30.000');
    expect(r.remaining).toBe('70.000');
  });

  it('applyDispatch lot quantity düşürür, event yayınlar', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    agg = agg.addLot(makeLot('lot_x', '100', new Date('2026-06-01')));
    const r = agg.dispatch('40', new Date('2026-03-01'));
    const after = agg.applyDispatch(r.allocations[0]!);
    expect(after.getLots()[0]?.getQuantityOnHand()).toBe('60.000');
    const events = after.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'LotConsumed')).toBe(true);
  });

  it('dispatch QUARANTINED lotu atlar', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    const q = makeLot('lot_q', '100', new Date('2026-06-01')).withStatus(LotStatus.quarantined());
    agg = agg.addLot(q);
    agg = agg.addLot(makeLot('lot_a', '50', new Date('2026-12-31')));
    const r = agg.dispatch('30', new Date('2026-03-01'));
    expect(r.allocations[0]?.lot.getId().getValue()).toBe('lot_a');
  });

  it('expireAt AVAILABLE → EXPIRED, event yayınlar', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    agg = agg.addLot(makeLot('lot_old', '50', new Date('2026-01-01')));
    agg = agg.addLot(makeLot('lot_fresh', '30', new Date('2027-01-01')));
    const at = new Date('2026-06-01');
    const { aggregate, expiredCount } = agg.expireAt(at);
    expect(expiredCount).toBe(1);
    const oldLot = aggregate.getLots().find((l) => l.getId().getValue() === 'lot_old');
    expect(oldLot?.getStatus().getKind()).toBe('EXPIRED');
    const events = aggregate.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'LotExpired')).toBe(true);
  });

  it('expireAt zaten expired lotu değiştirmez', () => {
    let agg = LotAggregate.empty('p1', 'loc_1');
    const exp = makeLot('lot_e', '10', new Date('2025-01-01')).withStatus(LotStatus.expired());
    agg = agg.addLot(exp);
    const { expiredCount } = agg.expireAt(new Date('2026-12-31'));
    expect(expiredCount).toBe(0);
  });
});
