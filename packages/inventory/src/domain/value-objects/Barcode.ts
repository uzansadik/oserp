import { ValidationError } from '../errors/ValidationError';

const BARCODE_REGEX = /^[A-Z0-9\-_./]{4,64}$/;

/**
 * BarcodeSymbology — Barkod formatı.
 */
export enum BarcodeSymbology {
  EAN13 = 'EAN13',
  EAN8 = 'EAN8',
  UPC = 'UPC',
  CODE128 = 'CODE128',
  CODE39 = 'CODE39',
  QR = 'QR',
  CUSTOM = 'CUSTOM',
}

const ALLOWED: ReadonlyArray<BarcodeSymbology> = [
  BarcodeSymbology.EAN13,
  BarcodeSymbology.EAN8,
  BarcodeSymbology.UPC,
  BarcodeSymbology.CODE128,
  BarcodeSymbology.CODE39,
  BarcodeSymbology.QR,
  BarcodeSymbology.CUSTOM,
];

/**
 * Barcode — Ürüne ait barkod (entity gibi davranır; product aggregate'inin parçası).
 *
 * Invariantlar:
 *  - code benzersiz (DB seviyesinde)
 *  - symbology EAN13 ise code 13 haneli
 *  - symbology EAN8 ise code 8 haneli
 *  - symbology UPC ise code 12 haneli
 */
export class Barcode {
  private constructor(
    private readonly code: string,
    private readonly symbology: BarcodeSymbology,
    private readonly isPrimary: boolean,
  ) {}

  static create(
    code: string,
    symbology: BarcodeSymbology | string = BarcodeSymbology.CUSTOM,
    isPrimary = false,
  ): Barcode {
    const upperCode = code.trim().toUpperCase();
    if (!BARCODE_REGEX.test(upperCode)) {
      throw new ValidationError(`Invalid barcode format: ${code}`);
    }
    const symUpper = String(symbology).toUpperCase() as BarcodeSymbology;
    if (!ALLOWED.includes(symUpper)) {
      throw new ValidationError(
        `Invalid barcode symbology: ${symbology} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    if (symUpper === BarcodeSymbology.EAN13 && !/^\d{13}$/.test(upperCode)) {
      throw new ValidationError('EAN13 must be 13 digits');
    }
    if (symUpper === BarcodeSymbology.EAN8 && !/^\d{8}$/.test(upperCode)) {
      throw new ValidationError('EAN8 must be 8 digits');
    }
    if (symUpper === BarcodeSymbology.UPC && !/^\d{12}$/.test(upperCode)) {
      throw new ValidationError('UPC must be 12 digits');
    }
    return new Barcode(upperCode, symUpper, isPrimary);
  }

  getCode(): string {
    return this.code;
  }
  getSymbology(): BarcodeSymbology {
    return this.symbology;
  }
  isPrimaryBarcode(): boolean {
    return this.isPrimary;
  }

  markPrimary(): Barcode {
    return new Barcode(this.code, this.symbology, true);
  }

  equals(other: Barcode): boolean {
    return this.code === other.code && this.symbology === other.symbology;
  }

  static equals(a: Barcode, b: Barcode): boolean {
    return a.code === b.code && a.symbology === b.symbology;
  }
}
