import { ReservationStatus } from '@oserp-community/inventory/domain/value-objects/ReservationStatus';

describe('ReservationStatus', () => {
  it('başlangıç durumu HELD', () => {
    expect(ReservationStatus.held().getKind()).toBe('HELD');
  });

  it('COMMITTED, RELEASED, EXPIRED factory metodları', () => {
    expect(ReservationStatus.committed().getKind()).toBe('COMMITTED');
    expect(ReservationStatus.released().getKind()).toBe('RELEASED');
    expect(ReservationStatus.expired().getKind()).toBe('EXPIRED');
  });

  it('HELD → COMMITTED geçişi kabul', () => {
    expect(ReservationStatus.held().canTransitionTo(ReservationStatus.committed())).toBe(true);
  });

  it('HELD → RELEASED geçişi kabul', () => {
    expect(ReservationStatus.held().canTransitionTo(ReservationStatus.released())).toBe(true);
  });

  it('HELD → EXPIRED geçişi kabul', () => {
    expect(ReservationStatus.held().canTransitionTo(ReservationStatus.expired())).toBe(true);
  });

  it('COMMITTED → RELEASED geçişi reddedilir', () => {
    expect(ReservationStatus.committed().canTransitionTo(ReservationStatus.released())).toBe(false);
  });

  it('RELEASED → HELD geçişi reddedilir (terminal)', () => {
    expect(ReservationStatus.released().canTransitionTo(ReservationStatus.held())).toBe(false);
  });

  it('EXPIRED → COMMITTED geçişi reddedilir (terminal)', () => {
    expect(ReservationStatus.expired().canTransitionTo(ReservationStatus.committed())).toBe(false);
  });

  it('idempotent: aynı state\'e geçiş kabul', () => {
    expect(ReservationStatus.held().canTransitionTo(ReservationStatus.held())).toBe(true);
    expect(ReservationStatus.committed().canTransitionTo(ReservationStatus.committed())).toBe(true);
  });

  it('isTerminal: RELEASED ve EXPIRED terminal, HELD ve COMMITTED değil', () => {
    expect(ReservationStatus.held().isTerminal()).toBe(false);
    expect(ReservationStatus.committed().isTerminal()).toBe(false);
    expect(ReservationStatus.released().isTerminal()).toBe(true);
    expect(ReservationStatus.expired().isTerminal()).toBe(true);
  });

  it('fromKind round-trip', () => {
    for (const k of ['HELD', 'COMMITTED', 'RELEASED', 'EXPIRED'] as const) {
      expect(ReservationStatus.fromKind(k).getKind()).toBe(k);
    }
  });

  it('equals doğru çalışır', () => {
    expect(ReservationStatus.held().equals(ReservationStatus.held())).toBe(true);
    expect(ReservationStatus.held().equals(ReservationStatus.committed())).toBe(false);
  });
});
