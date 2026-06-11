import { TransferLine } from '@oserp-community/inventory/domain/entities/TransferLine';
import { TransferLineRef } from '@oserp-community/inventory/domain/value-objects/TransferId';

describe('TransferLine', () => {
  it('pozitif requested ile oluşturulabilir', () => {
    const line = TransferLine.create({
      ref: TransferLineRef.of('prod_1', null),
      requestedQuantity: '100',
      uom: 'EA',
      selectedLotId: null,
      dispatchedQuantity: '0',
      receivedQuantity: '0',
      notes: null,
    });
    expect(line.getRequestedQuantity()).toBe('100');
    expect(line.getUom()).toBe('EA');
    expect(line.getSelectedLotId()).toBeNull();
  });

  it('negatif/zero requested reddedilir', () => {
    expect(() =>
      TransferLine.create({
        ref: TransferLineRef.of('prod_1', null),
        requestedQuantity: '0',
        uom: 'EA',
        selectedLotId: null,
        dispatchedQuantity: '0',
        receivedQuantity: '0',
        notes: null,
      }),
    ).toThrow(/positive/);
    expect(() =>
      TransferLine.create({
        ref: TransferLineRef.of('prod_1', null),
        requestedQuantity: '-5',
        uom: 'EA',
        selectedLotId: null,
        dispatchedQuantity: '0',
        receivedQuantity: '0',
        notes: null,
      }),
    ).toThrow(/positive/);
  });

  it('uom zorunlu', () => {
    expect(() =>
      TransferLine.create({
        ref: TransferLineRef.of('prod_1', null),
        requestedQuantity: '10',
        uom: '',
        selectedLotId: null,
        dispatchedQuantity: '0',
        receivedQuantity: '0',
        notes: null,
      }),
    ).toThrow(/uom/);
  });

  it('dispatch: lot ve dispatched quantity güncellenir', () => {
    const line = TransferLine.create({
      ref: TransferLineRef.of('prod_1', null),
      requestedQuantity: '100',
      uom: 'EA',
      selectedLotId: null,
      dispatchedQuantity: '0',
      receivedQuantity: '0',
      notes: null,
    });
    const dispatched = line.withDispatch('lot_a', '95');
    expect(dispatched.getSelectedLotId()).toBe('lot_a');
    expect(dispatched.getDispatchedQuantity()).toBe('95');
  });

  it('dispatch: dispatched > requested reddedilir', () => {
    const line = TransferLine.create({
      ref: TransferLineRef.of('prod_1', null),
      requestedQuantity: '50',
      uom: 'EA',
      selectedLotId: null,
      dispatchedQuantity: '0',
      receivedQuantity: '0',
      notes: null,
    });
    expect(() => line.withDispatch('lot_a', '60')).toThrow(/requested/);
  });

  it('receive: variance = dispatched - received', () => {
    const line = TransferLine.create({
      ref: TransferLineRef.of('prod_1', null),
      requestedQuantity: '100',
      uom: 'EA',
      selectedLotId: 'lot_a',
      dispatchedQuantity: '100',
      receivedQuantity: '0',
      notes: null,
    });
    const received = line.withReceive('92');
    expect(received.getReceivedQuantity()).toBe('92');
    expect(received.getVariance()).toBe('8');
    expect(received.hasVariance()).toBe(true);
  });

  it('isFullyReceived: received === dispatched', () => {
    const line = TransferLine.create({
      ref: TransferLineRef.of('prod_1', null),
      requestedQuantity: '100',
      uom: 'EA',
      selectedLotId: 'lot_a',
      dispatchedQuantity: '100',
      receivedQuantity: '0',
      notes: null,
    });
    expect(line.isFullyReceived()).toBe(false);
    const fully = line.withReceive('100');
    expect(fully.isFullyReceived()).toBe(true);
    expect(fully.hasVariance()).toBe(false);
  });
});
