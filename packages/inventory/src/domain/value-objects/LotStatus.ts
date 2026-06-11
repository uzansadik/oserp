/**
 * LotStatus Value Object
 *
 * Lifecycle states for a lot:
 *   - AVAILABLE:   in stock, can be dispatched
 *   - QUARANTINED: held back (quality hold, customs, etc.), not dispatchable
 *   - EXPIRED:     past expiry date, can no longer be dispatched
 *   - CONSUMED:    fully depleted (quantityOnHand = 0), archived
 *   - DEPLETED:    alias for CONSUMED (preferred terminology)
 *
 * State machine:
 *   AVAILABLE → QUARANTINED → AVAILABLE
 *   AVAILABLE → EXPIRED     (automatic on date check)
 *   AVAILABLE → DEPLETED    (automatic on quantity=0)
 *   QUARANTINED → EXPIRED
 *
 * Only AVAILABLE lots participate in FEFO dispatch.
 */
export type LotStatusKind = 'AVAILABLE' | 'QUARANTINED' | 'EXPIRED' | 'DEPLETED';

export class LotStatus {
  private constructor(private readonly kind: LotStatusKind) {
    Object.freeze(this);
  }

  static available(): LotStatus {
    return new LotStatus('AVAILABLE');
  }
  static quarantined(): LotStatus {
    return new LotStatus('QUARANTINED');
  }
  static expired(): LotStatus {
    return new LotStatus('EXPIRED');
  }
  static depleted(): LotStatus {
    return new LotStatus('DEPLETED');
  }

  static fromKind(kind: LotStatusKind): LotStatus {
    switch (kind) {
      case 'AVAILABLE':
        return LotStatus.available();
      case 'QUARANTINED':
        return LotStatus.quarantined();
      case 'EXPIRED':
        return LotStatus.expired();
      case 'DEPLETED':
        return LotStatus.depleted();
      default:
        throw new Error(`Unknown lot status: ${kind as string}`);
    }
  }

  getKind(): LotStatusKind {
    return this.kind;
  }

  isDispatchable(): boolean {
    return this.kind === 'AVAILABLE';
  }

  /**
   * Allowed transitions. Returns true if `next` is reachable from this status.
   */
  canTransitionTo(next: LotStatus): boolean {
    const t = this.kind;
    const n = next.kind;
    if (t === n) return true; // idempotent
    if (t === 'AVAILABLE') return n === 'QUARANTINED' || n === 'EXPIRED' || n === 'DEPLETED';
    if (t === 'QUARANTINED') return n === 'AVAILABLE' || n === 'EXPIRED' || n === 'DEPLETED';
    // EXPIRED and DEPLETED are terminal
    return false;
  }

  equals(other: LotStatus): boolean {
    if (!(other instanceof LotStatus)) return false;
    return this.kind === other.kind;
  }

  toString(): string {
    return this.kind;
  }
}
