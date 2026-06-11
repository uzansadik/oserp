/**
 * MovementDirection — Hareketin yönü.
 *  - IN:      stoğa giriş (RECEIPT, ADJUSTMENT+)
 *  - OUT:     stoktan çıkış (ISSUE, ADJUSTMENT-, SCRAP)
 *  - INTERNAL: lokasyonlar arası (TRANSFER — çift satır olarak modellenir)
 */
export enum MovementDirection {
  IN = 'IN',
  OUT = 'OUT',
  INTERNAL = 'INTERNAL',
}

const ALLOWED: ReadonlyArray<MovementDirection> = [
  MovementDirection.IN,
  MovementDirection.OUT,
  MovementDirection.INTERNAL,
];

import { ValidationError } from '../errors/ValidationError';

export class MovementDirectionVO {
  private constructor(private readonly value: MovementDirection) {}

  static create(direction: MovementDirection | string): MovementDirectionVO {
    const upper = String(direction).toUpperCase() as MovementDirection;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid movement direction: ${direction} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new MovementDirectionVO(upper);
  }

  static in(): MovementDirectionVO { return new MovementDirectionVO(MovementDirection.IN); }
  static out(): MovementDirectionVO { return new MovementDirectionVO(MovementDirection.OUT); }
  static internal(): MovementDirectionVO { return new MovementDirectionVO(MovementDirection.INTERNAL); }

  getValue(): MovementDirection { return this.value; }
  isIn(): boolean { return this.value === MovementDirection.IN; }
  isOut(): boolean { return this.value === MovementDirection.OUT; }
  isInternal(): boolean { return this.value === MovementDirection.INTERNAL; }

  equals(other: MovementDirectionVO): boolean { return this.value === other.value; }
  static equals(a: MovementDirectionVO, b: MovementDirectionVO): boolean { return a.value === b.value; }
}
