/**
 * SerialNumber Value Object
 *
 * Individual unit serial number (within a lot). Distinct from LotId which
 * identifies the whole batch. For products tracked at unit level (electronics,
 * serialized equipment), each unit gets a SerialNumber.
 *
 * Examples:
 *   "SN-12345"
 *   "IMEI-490154203237518"
 *   "<auto: <lotId>-<seq>>"
 *
 * A lot may have 0..N serial numbers. Lot.quantityOnHand should match the
 * serialNumbers count for fully serialized lots; for batch-only lots,
 * serialNumbers may be empty.
 */
const SN_REGEX = /^[A-Za-z0-9._:-]{1,128}$/;

export class SerialNumber {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): SerialNumber {
    if (!value || !SN_REGEX.test(value)) {
      throw new Error(`Invalid SerialNumber: ${value}`);
    }
    return new SerialNumber(value);
  }

  static tryOf(value: string): SerialNumber | null {
    if (!value || !SN_REGEX.test(value)) return null;
    return new SerialNumber(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SerialNumber): boolean {
    if (!(other instanceof SerialNumber)) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
