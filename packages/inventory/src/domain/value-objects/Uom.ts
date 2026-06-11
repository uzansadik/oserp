import { ValidationError } from '../errors/ValidationError';

const UOM_REGEX = /^[A-Z0-9_\-]{1,16}$/;

/**
 * Uom — Unit of Measure. Ölçü birimi (ad, kg, m, lt, koli, paket).
 *
 * Dönüşümler Faz 1'de basit (1:1) tutulur; ileride UomConversion tablosu
 * (StockUomConversion — Faz 2+) ile zenginleştirilir.
 */
export class Uom {
  private constructor(private readonly value: string) {}

  static create(uom: string): Uom {
    const normalized = uom.trim().toUpperCase();
    if (!normalized) {
      throw new ValidationError('Uom cannot be empty');
    }
    if (!UOM_REGEX.test(normalized)) {
      throw new ValidationError(
        `Invalid UOM code: ${normalized} (1-16 uppercase alphanum, '-', '_')`,
      );
    }
    return new Uom(normalized);
  }

  static adet(): Uom {
    return new Uom('UNT');
  }
  static kilogram(): Uom {
    return new Uom('KG');
  }
  static liter(): Uom {
    return new Uom('LT');
  }
  static meter(): Uom {
    return new Uom('M');
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: Uom): boolean {
    return this.value === other.value;
  }

  static equals(a: Uom, b: Uom): boolean {
    return a.value === b.value;
  }
}
