import { ReservationLine } from '@oserp-community/inventory/domain/entities/ReservationLine';
import { ReservationLineRef } from '@oserp-community/inventory/domain/value-objects/ReservationId';

describe('ReservationLine', () => {
  it('pozitif quantity ile oluşturulabilir', () => {
    const line = ReservationLine.create({
      ref: ReservationLineRef.of('p1', 'L1', null),
      reservedQuantity: '10',
      uom: 'EA',
      lotAllocations: [{ lotId: null, quantity: '10' }],
      notes: null,
    });
    expect(line.getProductId()).toBe('p1');
    expect(line.getLocationId()).toBe('L1');
    expect(line.getReservedQuantity()).toBe('10');
  });

  it('negatif/zero quantity reddedilir', () => {
    expect(() =>
      ReservationLine.create({
        ref: ReservationLineRef.of('p1', 'L1', null),
        reservedQuantity: '0',
        uom: 'EA',
        lotAllocations: [{ lotId: null, quantity: '0' }],
        notes: null,
      }),
    ).toThrow(/positive/);
    expect(() =>
      ReservationLine.create({
        ref: ReservationLineRef.of('p1', 'L1', null),
        reservedQuantity: '-5',
        uom: 'EA',
        lotAllocations: [{ lotId: null, quantity: '-5' }],
        notes: null,
      }),
    ).toThrow(/positive/);
  });

  it('boş lotAllocations reddedilir', () => {
    expect(() =>
      ReservationLine.create({
        ref: ReservationLineRef.of('p1', 'L1', null),
        reservedQuantity: '10',
        uom: 'EA',
        lotAllocations: [],
        notes: null,
      }),
    ).toThrow(/at least one/);
  });

  it('lotAllocations toplamı reservedQuantity ile eşleşmeli', () => {
    expect(() =>
      ReservationLine.create({
        ref: ReservationLineRef.of('p1', 'L1', null),
        reservedQuantity: '10',
        uom: 'EA',
        lotAllocations: [
          { lotId: 'lot_a', quantity: '5' },
          { lotId: 'lot_b', quantity: '3' },
        ],
        notes: null,
      }),
    ).toThrow(/sum/);
  });

  it('uom zorunlu', () => {
    expect(() =>
      ReservationLine.create({
        ref: ReservationLineRef.of('p1', 'L1', null),
        reservedQuantity: '10',
        uom: '',
        lotAllocations: [{ lotId: null, quantity: '10' }],
        notes: null,
      }),
    ).toThrow(/uom/);
  });

  it('lotId ile oluşturulabilir', () => {
    const line = ReservationLine.create({
      ref: ReservationLineRef.of('p1', 'L1', 'lot_xyz'),
      reservedQuantity: '10',
      uom: 'EA',
      lotAllocations: [{ lotId: 'lot_xyz', quantity: '10' }],
      notes: 'urgent',
    });
    expect(line.getLotId()).toBe('lot_xyz');
    expect(line.getNotes()).toBe('urgent');
  });
});
