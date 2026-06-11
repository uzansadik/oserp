import { LotStatus } from '@oserp-community/inventory/domain/value-objects/LotStatus';
import { describe, expect, it } from 'vitest';

describe('LotStatus', () => {
  it('AVAILABLE dispatchable', () => {
    expect(LotStatus.available().isDispatchable()).toBe(true);
  });

  it('QUARANTINED dispatchable değil', () => {
    expect(LotStatus.quarantined().isDispatchable()).toBe(false);
  });

  it('EXPIRED dispatchable değil, terminal', () => {
    expect(LotStatus.expired().isDispatchable()).toBe(false);
    expect(LotStatus.expired().canTransitionTo(LotStatus.available())).toBe(false);
  });

  it('AVAILABLE -> QUARANTINED -> AVAILABLE', () => {
    const q = LotStatus.quarantined();
    expect(LotStatus.available().canTransitionTo(q)).toBe(true);
    expect(q.canTransitionTo(LotStatus.available())).toBe(true);
  });

  it('AVAILABLE -> DEPLETED', () => {
    expect(LotStatus.available().canTransitionTo(LotStatus.depleted())).toBe(true);
  });

  it('idempotent transition', () => {
    expect(LotStatus.available().canTransitionTo(LotStatus.available())).toBe(true);
  });
});
