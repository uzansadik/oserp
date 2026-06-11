/**
 * LotId Value Object
 *
 * Strongly-typed lot identifier. Format: "lot_<timestamp>_<random>" or
 * "<productSku>_<mfgDate>_<seq>" depending on the org convention.
 * Validation: non-empty, max 128 chars, allowed chars [A-Za-z0-9._-].
 *
 * Carries NO business meaning — just a unique string for the lot.
 */
const LOT_ID_REGEX = /^[A-Za-z0-9._-]{1,128}$/;

export class LotId {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): LotId {
    if (!value || !LOT_ID_REGEX.test(value)) {
      throw new Error(`Invalid LotId: ${value}`);
    }
    return new LotId(value);
  }

  static tryOf(value: string): LotId | null {
    if (!value || !LOT_ID_REGEX.test(value)) return null;
    return new LotId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LotId): boolean {
    if (!(other instanceof LotId)) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
