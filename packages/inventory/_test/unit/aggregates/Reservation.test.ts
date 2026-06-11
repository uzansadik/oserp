import { Reservation } from '@oserp-community/inventory/domain/aggregates/Reservation';
import { ReservationLine } from '@oserp-community/inventory/domain/entities/ReservationLine';
import { ReservationLineRef } from '@oserp-community/inventory/domain/value-objects/ReservationId';
import { ReservationCreatedEvent } from '@oserp-community/inventory/domain/events/ReservationEvents';
import { ReservationCommittedEvent } from '@oserp-community/inventory/domain/events/ReservationEvents';
import { ReservationReleasedEvent } from '@oserp-community/inventory/domain/events/ReservationEvents';

function makeLine(productId: string, locationId: string, qty: string, uom = 'EA') {
  return ReservationLine.create({
    ref: ReservationLineRef.of(productId, locationId, null),
    reservedQuantity: qty,
    uom,
    lotAllocations: [{ lotId: null, quantity: qty }],
    notes: null,
  });
}

describe('Reservation Aggregate', () => {
  it('yeni reservation HELD durumunda oluşur', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    expect(r.getStatus().getKind()).toBe('HELD');
    expect(r.getVersion()).toBe(1);
  });

  it('oluşturulduğunda ReservationCreated event üretir', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    const events = r.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ReservationCreatedEvent);
  });

  it('commit: HELD → COMMITTED, event üretir', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    void r.pullDomainEvents();
    const committed = r.commit();
    expect(committed.getStatus().getKind()).toBe('COMMITTED');
    expect(committed.getCommittedAt()).not.toBeNull();
    const events = committed.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ReservationCommittedEvent);
  });

  it('release: HELD → RELEASED, event üretir', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    void r.pullDomainEvents();
    const released = r.release('test_reason');
    expect(released.getStatus().getKind()).toBe('RELEASED');
    expect(released.getReleasedAt()).not.toBeNull();
    const events = released.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ReservationReleasedEvent);
  });

  it('expire: HELD → EXPIRED, event üretir', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    void r.pullDomainEvents();
    const expired = r.expire();
    expect(expired.getStatus().getKind()).toBe('EXPIRED');
  });

  it('boş lines array reddedilir', () => {
    expect(() =>
      Reservation.create({
        id: 'res_1',
        orderId: 'order_1',
        customerId: 'cust_1',
        lines: [],
      }),
    ).toThrow(/at least one line/);
  });

  it('orderId olmadan oluşturulamaz', () => {
    expect(() =>
      Reservation.create({
        id: 'res_1',
        orderId: '',
        customerId: 'cust_1',
        lines: [makeLine('prod_1', 'WH-A', '10')],
      }),
    ).toThrow(/orderId/);
  });

  it('birden fazla line ile oluşturulabilir', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [
        makeLine('prod_1', 'WH-A', '5'),
        makeLine('prod_2', 'WH-A', '10'),
      ],
    });
    expect(r.getLines()).toHaveLength(2);
  });

  it('expiresAt ile oluşturulabilir', () => {
    const futureDate = new Date('2030-01-01');
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
      expiresAt: futureDate,
    });
    expect(r.getExpiresAt()).toEqual(futureDate);
    expect(r.isExpired(new Date('2030-06-01'))).toBe(true);
    expect(r.isExpired(new Date('2025-01-01'))).toBe(false);
  });

  it('idempotent commit: tekrar commit hata vermez', () => {
    const r = Reservation.create({
      id: 'res_1',
      orderId: 'order_1',
      customerId: 'cust_1',
      lines: [makeLine('prod_1', 'WH-A', '10')],
    });
    const committed1 = r.commit();
    void committed1.pullDomainEvents();
    const committed2 = committed1.commit(); // idempotent
    expect(committed2.getStatus().getKind()).toBe('COMMITTED');
  });
});
