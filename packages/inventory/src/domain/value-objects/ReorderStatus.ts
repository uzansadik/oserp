/**
 * ReorderStatus — Stok seviyesinin reorder durumu.
 *  - HEALTHY:    min ≤ onHand ≤ max
 *  - LOW:        onHand < min (veya min tanımsızsa reorderQty'ye göre)
 *  - OUT:        onHand = 0
 *  - OVERSTOCK:  onHand > max
 */
export enum ReorderStatus {
  HEALTHY = 'HEALTHY',
  LOW = 'LOW',
  OUT = 'OUT',
  OVERSTOCK = 'OVERSTOCK',
}

const ALLOWED: ReadonlyArray<ReorderStatus> = [
  ReorderStatus.HEALTHY,
  ReorderStatus.LOW,
  ReorderStatus.OUT,
  ReorderStatus.OVERSTOCK,
];

import { ValidationError } from '../errors/ValidationError';

export class ReorderStatusVO {
  private constructor(private readonly value: ReorderStatus) {}

  static create(status: ReorderStatus | string): ReorderStatusVO {
    const upper = String(status).toUpperCase() as ReorderStatus;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid reorder status: ${status} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new ReorderStatusVO(upper);
  }

  static healthy(): ReorderStatusVO { return new ReorderStatusVO(ReorderStatus.HEALTHY); }
  static low(): ReorderStatusVO { return new ReorderStatusVO(ReorderStatus.LOW); }
  static out(): ReorderStatusVO { return new ReorderStatusVO(ReorderStatus.OUT); }
  static overstock(): ReorderStatusVO { return new ReorderStatusVO(ReorderStatus.OVERSTOCK); }

  getValue(): ReorderStatus { return this.value; }
  isHealthy(): boolean { return this.value === ReorderStatus.HEALTHY; }
  isLow(): boolean { return this.value === ReorderStatus.LOW; }
  isOut(): boolean { return this.value === ReorderStatus.OUT; }
  isOverstock(): boolean { return this.value === ReorderStatus.OVERSTOCK; }

  equals(other: ReorderStatusVO): boolean { return this.value === other.value; }
  static equals(a: ReorderStatusVO, b: ReorderStatusVO): boolean { return a.value === b.value; }
}
