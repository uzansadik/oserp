/**
 * ReservationStatus + ReservationStatusMachine
 *
 * Reservation lifecycle (Faz 6):
 *
 *   HELD → COMMITTED → RELEASED
 *     ↓         ↓
 *   RELEASED  RELEASED
 *     ↓
 *   EXPIRED (auto, optional)
 *
 * - HELD      : stok rezerve edildi; inventoryLevel.reserved += qty
 *               → başka müşteriye satılamaz
 * - COMMITTED : rezerve edilen stok gerçekten sevkedildi (invoice paid)
 *               → inventoryLevel.onHand -= qty, reserved -= qty
 * - RELEASED  : rezervasyon iptal edildi (order cancelled veya expired)
 *               → inventoryLevel.reserved -= qty
 * - EXPIRED   : reservation TTL aşıldı, otomatik release (MVP'de opsiyonel)
 *
 * Idempotent transitions: aynı state'e geçiş kabul edilir.
 */
export type ReservationStatusKind = 'HELD' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';

export class ReservationStatus {
  private constructor(private readonly kind: ReservationStatusKind) {
    Object.freeze(this);
  }

  static held(): ReservationStatus {
    return new ReservationStatus('HELD');
  }

  static committed(): ReservationStatus {
    return new ReservationStatus('COMMITTED');
  }

  static released(): ReservationStatus {
    return new ReservationStatus('RELEASED');
  }

  static expired(): ReservationStatus {
    return new ReservationStatus('EXPIRED');
  }

  static fromKind(k: ReservationStatusKind): ReservationStatus {
    switch (k) {
      case 'HELD':
        return ReservationStatus.held();
      case 'COMMITTED':
        return ReservationStatus.committed();
      case 'RELEASED':
        return ReservationStatus.released();
      case 'EXPIRED':
        return ReservationStatus.expired();
      default:
        throw new Error(`Unknown ReservationStatus: ${k as string}`);
    }
  }

  getKind(): ReservationStatusKind {
    return this.kind;
  }

  isTerminal(): boolean {
    return this.kind === 'RELEASED' || this.kind === 'EXPIRED';
  }

  canTransitionTo(next: ReservationStatus): boolean {
    const t = this.kind;
    const n = next.kind;
    if (t === n) return true; // idempotent
    if (t === 'HELD' && (n === 'COMMITTED' || n === 'RELEASED' || n === 'EXPIRED')) return true;
    return false;
  }

  equals(other: ReservationStatus): boolean {
    return other instanceof ReservationStatus && this.kind === other.kind;
  }

  toString(): string {
    return this.kind;
  }
}
