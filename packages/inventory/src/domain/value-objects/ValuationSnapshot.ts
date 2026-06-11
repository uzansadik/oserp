/**
 * ValuationSnapshot — Stok seviyesinin değerleme bilgisi.
 * Şimdilik sadece `totalValue` (Money cinsinden). Detaylı costing
 * (FIFO/LIFO/WAC) Faz 2'de sade tutulur; Faz 3'te zenginleşir.
 */
import { Money } from './Money';

export class ValuationSnapshot {
  private constructor(private readonly totalValue: Money | null) {}

  static empty(): ValuationSnapshot {
    return new ValuationSnapshot(null);
  }

  static of(totalValue: Money): ValuationSnapshot {
    return new ValuationSnapshot(totalValue);
  }

  getTotalValue(): Money | null { return this.totalValue; }

  equals(other: ValuationSnapshot): boolean {
    if (this.totalValue === null && other.totalValue === null) return true;
    if (this.totalValue === null || other.totalValue === null) return false;
    return this.totalValue.equals(other.totalValue);
  }
}
