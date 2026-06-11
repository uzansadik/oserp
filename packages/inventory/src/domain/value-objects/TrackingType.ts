/**
 * TrackingType — Seri/Lot izleme modu.
 *
 * - NONE: izleme yok
 * - LOT: parti bazlı izleme (FEFO/FIFO)
 * - SERIAL: her birim unique seri numarası
 *
 * Sadece STORABLE ürünler için LOT/SERIAL kullanılabilir; diğerlerinde NONE.
 */
export enum TrackingType {
  NONE = 'NONE',
  LOT = 'LOT',
  SERIAL = 'SERIAL',
}

const ALLOWED: ReadonlyArray<TrackingType> = [
  TrackingType.NONE,
  TrackingType.LOT,
  TrackingType.SERIAL,
];

import { ValidationError } from '../errors/ValidationError';

export class TrackingTypeVO {
  private constructor(private readonly value: TrackingType) {}

  static create(type: TrackingType | string): TrackingTypeVO {
    const upper = String(type).toUpperCase() as TrackingType;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid tracking type: ${type} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new TrackingTypeVO(upper);
  }

  static none(): TrackingTypeVO {
    return new TrackingTypeVO(TrackingType.NONE);
  }
  static lot(): TrackingTypeVO {
    return new TrackingTypeVO(TrackingType.LOT);
  }
  static serial(): TrackingTypeVO {
    return new TrackingTypeVO(TrackingType.SERIAL);
  }

  getValue(): TrackingType {
    return this.value;
  }

  isNone(): boolean {
    return this.value === TrackingType.NONE;
  }
  isLot(): boolean {
    return this.value === TrackingType.LOT;
  }
  isSerial(): boolean {
    return this.value === TrackingType.SERIAL;
  }

  equals(other: TrackingTypeVO): boolean {
    return this.value === other.value;
  }

  static equals(a: TrackingTypeVO, b: TrackingTypeVO): boolean {
    return a.value === b.value;
  }
}
