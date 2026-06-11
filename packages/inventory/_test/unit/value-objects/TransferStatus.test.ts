import { TransferStatus } from '@oserp-community/inventory/domain/value-objects/TransferStatus';

describe('TransferStatus', () => {
  it('factory: DRAFT, DISPATCHED, IN_TRANSIT, RECEIVED, CLOSED, CANCELLED', () => {
    expect(TransferStatus.draft().getKind()).toBe('DRAFT');
    expect(TransferStatus.dispatched().getKind()).toBe('DISPATCHED');
    expect(TransferStatus.inTransit().getKind()).toBe('IN_TRANSIT');
    expect(TransferStatus.received().getKind()).toBe('RECEIVED');
    expect(TransferStatus.closed().getKind()).toBe('CLOSED');
    expect(TransferStatus.cancelled().getKind()).toBe('CANCELLED');
  });

  it('happy path: DRAFT → DISPATCHED → IN_TRANSIT → RECEIVED → CLOSED', () => {
    const s = TransferStatus.draft();
    expect(s.canTransitionTo(TransferStatus.dispatched())).toBe(true);
    expect(TransferStatus.dispatched().canTransitionTo(TransferStatus.inTransit())).toBe(true);
    expect(TransferStatus.inTransit().canTransitionTo(TransferStatus.received())).toBe(true);
    expect(TransferStatus.received().canTransitionTo(TransferStatus.closed())).toBe(true);
  });

  it('DRAFT → CANCELLED kabul, başka state\'ten CANCELLED reddedilir', () => {
    expect(TransferStatus.draft().canTransitionTo(TransferStatus.cancelled())).toBe(true);
    expect(TransferStatus.dispatched().canTransitionTo(TransferStatus.cancelled())).toBe(false);
    expect(TransferStatus.inTransit().canTransitionTo(TransferStatus.cancelled())).toBe(false);
    expect(TransferStatus.received().canTransitionTo(TransferStatus.cancelled())).toBe(false);
  });

  it('CLOSED terminal: hiçbir state\'e geçemez (idempotent hariç)', () => {
    const closed = TransferStatus.closed();
    expect(closed.canTransitionTo(TransferStatus.draft())).toBe(false);
    expect(closed.canTransitionTo(TransferStatus.dispatched())).toBe(false);
    expect(closed.canTransitionTo(TransferStatus.cancelled())).toBe(false);
    expect(closed.canTransitionTo(TransferStatus.closed())).toBe(true); // idempotent
  });

  it('CANCELLED terminal', () => {
    const c = TransferStatus.cancelled();
    expect(c.canTransitionTo(TransferStatus.draft())).toBe(false);
    expect(c.canTransitionTo(TransferStatus.dispatched())).toBe(false);
    expect(c.canTransitionTo(TransferStatus.cancelled())).toBe(true); // idempotent
  });

  it('idempotent: aynı state\'e geçiş kabul', () => {
    for (const s of [
      TransferStatus.draft(),
      TransferStatus.dispatched(),
      TransferStatus.inTransit(),
      TransferStatus.received(),
    ]) {
      expect(s.canTransitionTo(s)).toBe(true);
    }
  });

  it('isTerminal: CLOSED ve CANCELLED terminal', () => {
    expect(TransferStatus.draft().isTerminal()).toBe(false);
    expect(TransferStatus.dispatched().isTerminal()).toBe(false);
    expect(TransferStatus.inTransit().isTerminal()).toBe(false);
    expect(TransferStatus.received().isTerminal()).toBe(false);
    expect(TransferStatus.closed().isTerminal()).toBe(true);
    expect(TransferStatus.cancelled().isTerminal()).toBe(true);
  });

  it('isInFlight: DISPATCHED + IN_TRANSIT', () => {
    expect(TransferStatus.draft().isInFlight()).toBe(false);
    expect(TransferStatus.dispatched().isInFlight()).toBe(true);
    expect(TransferStatus.inTransit().isInFlight()).toBe(true);
    expect(TransferStatus.received().isInFlight()).toBe(false);
    expect(TransferStatus.closed().isInFlight()).toBe(false);
    expect(TransferStatus.cancelled().isInFlight()).toBe(false);
  });

  it('fromKind round-trip', () => {
    const kinds = ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'CLOSED', 'CANCELLED'] as const;
    for (const k of kinds) {
      expect(TransferStatus.fromKind(k).getKind()).toBe(k);
    }
  });

  it('geçersiz geçiş: DRAFT → RECEIVED reddedilir', () => {
    expect(TransferStatus.draft().canTransitionTo(TransferStatus.received())).toBe(false);
  });

  it('geçersiz geçiş: RECEIVED → DISPATCHED reddedilir (geri dönüş yok)', () => {
    expect(TransferStatus.received().canTransitionTo(TransferStatus.dispatched())).toBe(false);
  });
});
