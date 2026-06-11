import { FefoDispatchStrategy } from '@oserp-community/inventory/application/services/FefoDispatchStrategy';
import { ExpiryDate } from '@oserp-community/inventory/domain/value-objects/ExpiryDate';
import { Lot } from '@oserp-community/inventory/domain/entities/Lot';
import { LotId } from '@oserp-community/inventory/domain/value-objects/LotId';
import { LotStatus } from '@oserp-community/inventory/domain/value-objects/LotStatus';
import { describe, expect, it } from 'vitest';

function makeLot(id: string, expiry: Date | null): Lot {
  return Lot.create({
    id: LotId.of(id),
    productId: 'p1',
    locationId: 'loc_1',
    quantityOnHand: '10',
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

describe('FefoDispatchStrategy', () => {
  const strategy = new FefoDispatchStrategy();

  it('name FEFO', () => {
    expect(strategy.name).toBe('FEFO');
  });

  it('en yakın SKT ilk', () => {
    const a = makeLot('a', new Date('2026-12-31'));
    const b = makeLot('b', new Date('2026-06-01'));
    const ordered = strategy.order([a, b], new Date('2026-03-01'));
    expect(ordered[0]?.getId().getValue()).toBe('b');
  });

  it('QUARANTINED lotu atlar', () => {
    const a = makeLot('a', new Date('2026-06-01'));
    const b = makeLot('b', new Date('2026-12-31')).withStatus(LotStatus.quarantined());
    const ordered = strategy.order([a, b], new Date('2026-03-01'));
    expect(ordered.length).toBe(1);
    expect(ordered[0]?.getId().getValue()).toBe('a');
  });

  it('expired lotu atlar', () => {
    const a = makeLot('a', new Date('2026-06-01'));
    const ordered = strategy.order([a], new Date('2026-12-31'));
    expect(ordered.length).toBe(0);
  });

  it('no-expiry lots sort last', () => {
    const a = makeLot('a', null);
    const b = makeLot('b', new Date('2026-06-01'));
    const ordered = strategy.order([a, b], new Date('2026-03-01'));
    expect(ordered[0]?.getId().getValue()).toBe('b');
    expect(ordered[1]?.getId().getValue()).toBe('a');
  });
});
