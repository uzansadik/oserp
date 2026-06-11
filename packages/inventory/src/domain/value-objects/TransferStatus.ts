/**
 * TransferStatus + TransferStatusMachine
 *
 * TransferOrder lifecycle (Faz 7):
 *
 *   DRAFT → DISPATCHED → IN_TRANSIT → RECEIVED → CLOSED
 *     ↓          ↓              ↓
 *  CANCELLED  CANCELLED      (partial receive sonrası CLOSED)
 *
 * - DRAFT      : transfer oluşturuldu, dispatch henüz yapılmadı
 *                → stock level'lar değişmedi
 * - DISPATCHED : kaynak lokasyondan stok çıkışı yapıldı (inTransit += qty)
 *                → source.onHand -= qty, source.inTransit += qty
 * - IN_TRANSIT : fiziksel transfer yolda; quantity inTransit olarak işaretli
 *                → henüz available değil (onHand - inTransit)
 * - RECEIVED   : hedef lokasyon malı kabul etti (partial veya full)
 *                → target.onHand += qty
 *                → source.inTransit -= qty (veya qty - variance)
 * - CLOSED     : tüm satırlar reconcile edildi, faturalandırılabilir
 * - CANCELLED  : dispatch'ten ÖNCE iptal (stock etkisi yok)
 *                dispatch sonrası cancel: sadece DISPATCHED'da izin verilmez
 *                (yolda olan transfer CANCELLED olamaz, void/gibi)
 *
 * Idempotent transitions: aynı state'e geçiş kabul edilir.
 */
export type TransferStatusKind =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export class TransferStatus {
  private constructor(private readonly kind: TransferStatusKind) {
    Object.freeze(this);
  }

  static draft(): TransferStatus {
    return new TransferStatus('DRAFT');
  }
  static dispatched(): TransferStatus {
    return new TransferStatus('DISPATCHED');
  }
  static inTransit(): TransferStatus {
    return new TransferStatus('IN_TRANSIT');
  }
  static received(): TransferStatus {
    return new TransferStatus('RECEIVED');
  }
  static closed(): TransferStatus {
    return new TransferStatus('CLOSED');
  }
  static cancelled(): TransferStatus {
    return new TransferStatus('CANCELLED');
  }

  static fromKind(k: TransferStatusKind): TransferStatus {
    switch (k) {
      case 'DRAFT':
        return TransferStatus.draft();
      case 'DISPATCHED':
        return TransferStatus.dispatched();
      case 'IN_TRANSIT':
        return TransferStatus.inTransit();
      case 'RECEIVED':
        return TransferStatus.received();
      case 'CLOSED':
        return TransferStatus.closed();
      case 'CANCELLED':
        return TransferStatus.cancelled();
      default:
        throw new Error(`Unknown TransferStatus: ${k as string}`);
    }
  }

  getKind(): TransferStatusKind {
    return this.kind;
  }

  isTerminal(): boolean {
    return this.kind === 'CLOSED' || this.kind === 'CANCELLED';
  }

  isInFlight(): boolean {
    return this.kind === 'DISPATCHED' || this.kind === 'IN_TRANSIT';
  }

  canTransitionTo(next: TransferStatus): boolean {
    const t = this.kind;
    const n = next.kind;
    if (t === n) return true; // idempotent
    // Cancellation: sadece DRAFT'tan
    if (n === 'CANCELLED') {
      return t === 'DRAFT';
    }
    // Happy path
    if (t === 'DRAFT' && n === 'DISPATCHED') return true;
    if (t === 'DISPATCHED' && n === 'IN_TRANSIT') return true;
    if (t === 'IN_TRANSIT' && n === 'RECEIVED') return true;
    if (t === 'DISPATCHED' && n === 'RECEIVED') return true; // operasyonel kısayol
    if (t === 'RECEIVED' && n === 'CLOSED') return true;
    return false;
  }

  equals(other: TransferStatus): boolean {
    return other instanceof TransferStatus && this.kind === other.kind;
  }

  toString(): string {
    return this.kind;
  }
}
