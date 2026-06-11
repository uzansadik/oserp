/**
 * TransferId Value Object
 *
 * TransferOrder aggregate için unique identifier. ULID/UUID gibi
 * string tabanlı ID kabul eder; SalesOrderId/ReservationId ile aynı pattern.
 */
const ID_REGEX = /^[A-Za-z0-9._:-]{1,64}$/;

export class TransferId {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): TransferId {
    if (!value || !ID_REGEX.test(value)) {
      throw new Error(`Invalid TransferId: ${value}`);
    }
    return new TransferId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TransferId): boolean {
    return other instanceof TransferId && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * TransferLineRef — bir transfer içindeki bir kalem (productId + lotId?).
 * Lot bilgisi dispatch sırasında FEFO tarafından otomatik seçilir veya
 * kullanıcı tarafından manuel verilir.
 */
export class TransferLineRef {
  private constructor(
    private readonly productId: string,
    private readonly lotId: string | null,
  ) {
    Object.freeze(this);
  }

  static of(productId: string, lotId: string | null = null): TransferLineRef {
    if (!productId) throw new Error('TransferLineRef requires productId');
    return new TransferLineRef(productId, lotId);
  }

  getProductId(): string {
    return this.productId;
  }

  getLotId(): string | null {
    return this.lotId;
  }

  equals(other: TransferLineRef): boolean {
    return (
      other instanceof TransferLineRef &&
      this.productId === other.productId &&
      this.lotId === other.lotId
    );
  }

  toJSON(): { productId: string; lotId: string | null } {
    return { productId: this.productId, lotId: this.lotId };
  }
}
