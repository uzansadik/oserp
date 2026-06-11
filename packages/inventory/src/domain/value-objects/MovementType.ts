/**
 * MovementType — Stok hareketinin amacı.
 */
export enum MovementType {
  RECEIPT = 'RECEIPT',         // Mal kabul (IN)
  ISSUE = 'ISSUE',             // Çıkış/sarf (OUT)
  TRANSFER = 'TRANSFER',       // İç transfer (INTERNAL)
  ADJUSTMENT = 'ADJUSTMENT',   // Sayım farkı / düzeltme (IN veya OUT)
  SCRAP = 'SCRAP',             // Hurda / fire (OUT)
}

const ALLOWED: ReadonlyArray<MovementType> = [
  MovementType.RECEIPT,
  MovementType.ISSUE,
  MovementType.TRANSFER,
  MovementType.ADJUSTMENT,
  MovementType.SCRAP,
];

import { ValidationError } from '../errors/ValidationError';

export class MovementTypeVO {
  private constructor(private readonly value: MovementType) {}

  static create(type: MovementType | string): MovementTypeVO {
    const upper = String(type).toUpperCase() as MovementType;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid movement type: ${type} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new MovementTypeVO(upper);
  }

  static receipt(): MovementTypeVO { return new MovementTypeVO(MovementType.RECEIPT); }
  static issue(): MovementTypeVO { return new MovementTypeVO(MovementType.ISSUE); }
  static transfer(): MovementTypeVO { return new MovementTypeVO(MovementType.TRANSFER); }
  static adjustment(): MovementTypeVO { return new MovementTypeVO(MovementType.ADJUSTMENT); }
  static scrap(): MovementTypeVO { return new MovementTypeVO(MovementType.SCRAP); }

  getValue(): MovementType { return this.value; }

  isReceipt(): boolean { return this.value === MovementType.RECEIPT; }
  isIssue(): boolean { return this.value === MovementType.ISSUE; }
  isTransfer(): boolean { return this.value === MovementType.TRANSFER; }
  isAdjustment(): boolean { return this.value === MovementType.ADJUSTMENT; }
  isScrap(): boolean { return this.value === MovementType.SCRAP; }

  /** ADJUSTMENT ve SCRAP için reason code zorunlu mu? */
  requiresReasonCode(): boolean {
    return this.value === MovementType.ADJUSTMENT || this.value === MovementType.SCRAP;
  }

  equals(other: MovementTypeVO): boolean { return this.value === other.value; }
  static equals(a: MovementTypeVO, b: MovementTypeVO): boolean { return a.value === b.value; }
}
