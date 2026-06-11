/**
 * ProcurementPolicy — Tedarik stratejisi. Ürün nasıl tedarik edilir?
 *
 * - MAKE_TO_ORDER (MTO): Sipariş gelince üretim/temin başlar (klasik "sıfır stok" ürünler)
 * - MAKE_TO_STOCK (MTS): Önceden stoğa üretim (hazır bulundurulan)
 * - BUY: Dışarıdan satın alınır (hammadde, ticari mal)
 * - NONE: Tedarik kuralı yok (SERVICE / CONSUMABLE için)
 */
export enum ProcurementPolicy {
  MAKE_TO_ORDER = 'MAKE_TO_ORDER',
  MAKE_TO_STOCK = 'MAKE_TO_STOCK',
  BUY = 'BUY',
  NONE = 'NONE',
}

const ALLOWED: ReadonlyArray<ProcurementPolicy> = [
  ProcurementPolicy.MAKE_TO_ORDER,
  ProcurementPolicy.MAKE_TO_STOCK,
  ProcurementPolicy.BUY,
  ProcurementPolicy.NONE,
];

import { ValidationError } from '../errors/ValidationError';

export class ProcurementPolicyVO {
  private constructor(private readonly value: ProcurementPolicy) {}

  static create(policy: ProcurementPolicy | string): ProcurementPolicyVO {
    const upper = String(policy).toUpperCase() as ProcurementPolicy;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid procurement policy: ${policy} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new ProcurementPolicyVO(upper);
  }

  static makeToOrder(): ProcurementPolicyVO {
    return new ProcurementPolicyVO(ProcurementPolicy.MAKE_TO_ORDER);
  }
  static makeToStock(): ProcurementPolicyVO {
    return new ProcurementPolicyVO(ProcurementPolicy.MAKE_TO_STOCK);
  }
  static buy(): ProcurementPolicyVO {
    return new ProcurementPolicyVO(ProcurementPolicy.BUY);
  }
  static none(): ProcurementPolicyVO {
    return new ProcurementPolicyVO(ProcurementPolicy.NONE);
  }

  getValue(): ProcurementPolicy {
    return this.value;
  }

  isMakeToOrder(): boolean {
    return this.value === ProcurementPolicy.MAKE_TO_ORDER;
  }
  isMakeToStock(): boolean {
    return this.value === ProcurementPolicy.MAKE_TO_STOCK;
  }
  isBuy(): boolean {
    return this.value === ProcurementPolicy.BUY;
  }
  isNone(): boolean {
    return this.value === ProcurementPolicy.NONE;
  }

  equals(other: ProcurementPolicyVO): boolean {
    return this.value === other.value;
  }

  static equals(a: ProcurementPolicyVO, b: ProcurementPolicyVO): boolean {
    return a.value === b.value;
  }
}
