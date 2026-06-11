import { TransferOrder } from '@oserp-community/inventory/domain/aggregates/TransferOrder';
import { TransferLine } from '@oserp-community/inventory/domain/entities/TransferLine';
import { TransferLineRef } from '@oserp-community/inventory/domain/value-objects/TransferId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import {
  TransferCreatedEvent,
  TransferDispatchedEvent,
  TransferReceivedEvent,
  TransferClosedEvent,
  TransferCancelledEvent,
} from '@oserp-community/inventory/domain/events/TransferEvents';

function makeLine(productId: string, qty: string, uom = 'EA') {
  return TransferLine.create({
    ref: TransferLineRef.of(productId, null),
    requestedQuantity: qty,
    uom,
    selectedLotId: null,
    dispatchedQuantity: '0',
    receivedQuantity: '0',
    notes: null,
  });
}

function makeTransfer() {
  return TransferOrder.create({
    id: 'tr_1',
    transferNumber: 'TR-001',
    sourceLocation: LocationRef.create('WH-A'),
    destinationLocation: LocationRef.create('WH-B'),
    lines: [makeLine('prod_1', '100')],
  });
}

describe('TransferOrder Aggregate', () => {
  it('yeni transfer DRAFT durumunda oluşur', () => {
    const t = makeTransfer();
    expect(t.getStatus().getKind()).toBe('DRAFT');
    expect(t.getVersion()).toBe(1);
    expect(t.getTotalRequested()).toBe('100');
    expect(t.getTotalDispatched()).toBe('0');
    expect(t.getTotalReceived()).toBe('0');
  });

  it('created event üretir', () => {
    const t = makeTransfer();
    const events = t.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TransferCreatedEvent);
  });

  it('source ve destination aynı olamaz', () => {
    expect(() =>
      TransferOrder.create({
        id: 'tr_1',
        transferNumber: 'TR-001',
        sourceLocation: LocationRef.create('WH-A'),
        destinationLocation: LocationRef.create('WH-A'),
        lines: [makeLine('prod_1', '10')],
      }),
    ).toThrow(/must differ/);
  });

  it('boş lines reddedilir', () => {
    expect(() =>
      TransferOrder.create({
        id: 'tr_1',
        transferNumber: 'TR-001',
        sourceLocation: LocationRef.create('WH-A'),
        destinationLocation: LocationRef.create('WH-B'),
        lines: [],
      }),
    ).toThrow(/at least one line/);
  });

  it('dispatch: DRAFT → DISPATCHED, line dispatched güncellenir', () => {
    const t = makeTransfer();
    void t.pullDomainEvents();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    expect(dispatched.getStatus().getKind()).toBe('DISPATCHED');
    expect(dispatched.getTotalDispatched()).toBe('100');
    expect(dispatched.getDispatchedAt()).not.toBeNull();
    const events = dispatched.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TransferDispatchedEvent);
  });

  it('partial dispatch: requested < dispatched reddedilir', () => {
    const t = makeTransfer();
    void t.pullDomainEvents();
    expect(() =>
      t.dispatch([{ productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '150' }]),
    ).toThrow(/requested/);
  });

  it('dispatch: eksik line dispatch bilgisi hata', () => {
    const t = TransferOrder.create({
      id: 'tr_1',
      transferNumber: 'TR-001',
      sourceLocation: LocationRef.create('WH-A'),
      destinationLocation: LocationRef.create('WH-B'),
      lines: [makeLine('prod_1', '10'), makeLine('prod_2', '20')],
    });
    void t.pullDomainEvents();
    expect(() =>
      t.dispatch([{ productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '10' }]),
    ).toThrow(/expects 2 lines/);
  });

  it('receive: dispatched → received miktar, variance hesaplanır', () => {
    const t = makeTransfer();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    void dispatched.pullDomainEvents();
    const received = dispatched.receive([{ productId: 'prod_1', receivedQuantity: '95' }]);
    expect(received.getStatus().getKind()).toBe('RECEIVED');
    expect(received.getTotalReceived()).toBe('95');
    expect(received.getTotalVariance()).toBe('5');
    const events = received.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TransferReceivedEvent);
  });

  it('receive: received > dispatched reddedilir', () => {
    const t = makeTransfer();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    void dispatched.pullDomainEvents();
    expect(() =>
      dispatched.receive([{ productId: 'prod_1', receivedQuantity: '150' }]),
    ).toThrow(/dispatched/);
  });

  it('close: RECEIVED → CLOSED, total variance üretilir', () => {
    const t = makeTransfer();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    const received = dispatched.receive([{ productId: 'prod_1', receivedQuantity: '90' }]);
    void received.pullDomainEvents();
    const closed = received.close();
    expect(closed.getStatus().getKind()).toBe('CLOSED');
    const events = closed.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TransferClosedEvent);
  });

  it('cancel: sadece DRAFT', () => {
    const t = makeTransfer();
    const cancelled = t.cancel('test_reason');
    expect(cancelled.getStatus().getKind()).toBe('CANCELLED');
    const events = cancelled.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(TransferCancelledEvent);
  });

  it('cancel: DISPATCHED sonrası iptal edilemez', () => {
    const t = makeTransfer();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    void dispatched.pullDomainEvents();
    expect(() => dispatched.cancel('too_late')).toThrow(/only DRAFT/);
  });

  it('markInTransit: DISPATCHED → IN_TRANSIT', () => {
    const t = makeTransfer();
    const dispatched = t.dispatch([
      { productId: 'prod_1', lotId: 'lot_a', dispatchedQty: '100' },
    ]);
    void dispatched.pullDomainEvents();
    const inTransit = dispatched.markInTransit();
    expect(inTransit.getStatus().getKind()).toBe('IN_TRANSIT');
  });
});
