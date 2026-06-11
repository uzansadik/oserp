import { ExpiryDate } from '@oserp-community/inventory/domain/value-objects/ExpiryDate';
import { Lot } from '@oserp-community/inventory/domain/entities/Lot';
import { LotId } from '@oserp-community/inventory/domain/value-objects/LotId';
import { LotStatus } from '@oserp-community/inventory/domain/value-objects/LotStatus';
import { SerialNumber } from '@oserp-community/inventory/domain/value-objects/SerialNumber';
import { describe, expect, it } from 'vitest';

function makeLot(opts: { qty: string; expiry?: Date | null; status?: LotStatus } = { qty: '100' }): Lot {
  return Lot.create({
    id: LotId.of('lot_1'),
    productId: 'p1',
    locationId: 'loc_1',
    quantityOnHand: opts.qty,
    uom: 'EA',
    status: opts.status ?? LotStatus.available(),
    expiryDate: opts.expiry === null ? ExpiryDate.none() : ExpiryDate.of(opts.expiry ?? new Date('2026-12-31')),
    mfgDate: null,
    receivedAt: new Date('2026-01-01'),
    supplierLotCode: null,
    serialNumbers: [],
    notes: null,
    version: 1,
  });
}

describe('Lot', () => {
  it('create with positive quantity', () => {
    const l = makeLot({ qty: '50' });
    expect(l.getQuantityOnHand()).toBe('50');
    expect(l.isDispatchable()).toBe(true);
  });

  it('negatif quantity reddedilir', () => {
    expect(() => makeLot({ qty: '-5' })).toThrow();
  });

  it('unique serial numbers kabul, duplicate red', () => {
    const baseProps = {
      id: LotId.of('lot_s'),
      productId: 'p1',
      locationId: 'loc_1',
      quantityOnHand: '3',
      uom: 'EA',
      status: LotStatus.available(),
      expiryDate: ExpiryDate.none(),
      mfgDate: null,
      receivedAt: new Date(),
      supplierLotCode: null,
      notes: null,
      version: 1,
    };
    expect(() =>
      Lot.create({
        ...baseProps,
        serialNumbers: [SerialNumber.of('SN1'), SerialNumber.of('SN2'), SerialNumber.of('SN3')],
      }),
    ).not.toThrow();
    expect(() =>
      Lot.create({
        ...baseProps,
        serialNumbers: [SerialNumber.of('SN1'), SerialNumber.of('SN1')],
      }),
    ).toThrow(/unique/);
  });

  it('consume reduces quantity and returns new lot', () => {
    const l = makeLot({ qty: '100' });
    const after = l.consume('30');
    expect(after.getQuantityOnHand()).toBe('70.000');
    expect(after.getVersion()).toBe(2);
    expect(l.getQuantityOnHand()).toBe('100'); // immutability
  });

  it('consume to 0 sets DEPLETED', () => {
    const l = makeLot({ qty: '10' });
    const after = l.consume('10');
    expect(after.isDepleted()).toBe(true);
    expect(after.getStatus().getKind()).toBe('DEPLETED');
  });

  it('consume exceeds quantity reddedilir', () => {
    const l = makeLot({ qty: '10' });
    expect(() => l.consume('20')).toThrow(/Cannot consume/);
  });

  it('consume 0/negative reddedilir', () => {
    const l = makeLot({ qty: '10' });
    expect(() => l.consume('0')).toThrow();
    expect(() => l.consume('-1')).toThrow();
  });

  it('addQuantity increases', () => {
    const l = makeLot({ qty: '50' });
    const after = l.addQuantity('30');
    expect(after.getQuantityOnHand()).toBe('80.000');
  });

  it('withStatus transitions', () => {
    const l = makeLot({ qty: '50' });
    const q = l.withStatus(LotStatus.quarantined());
    expect(q.getStatus().getKind()).toBe('QUARANTINED');
    expect(() => l.withStatus(LotStatus.depleted())).not.toThrow();
  });

  it('isExpired doğru', () => {
    const l = makeLot({ qty: '50', expiry: new Date('2026-06-01') });
    expect(l.isExpired(new Date('2025-01-01'))).toBe(false);
    expect(l.isExpired(new Date('2026-12-31'))).toBe(true);
  });

  it('compareFefo: earlier expiry first', () => {
    const a = makeLot({ qty: '50', expiry: new Date('2026-06-01') });
    const b = makeLot({ qty: '50', expiry: new Date('2026-12-31') });
    expect(a.compareFefo(b)).toBeLessThan(0);
    expect(b.compareFefo(a)).toBeGreaterThan(0);
  });
});
