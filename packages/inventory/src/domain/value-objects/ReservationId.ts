/**
 * ReservationId Value Object
 *
 * Reservation aggregate için unique identifier. ULID/UUID gibi
 * string tabanlı ID kabul eder; SalesOrderId ile aynı pattern.
 */
const ID_REGEX = /^[A-Za-z0-9._:-]{1,64}$/;

export class ReservationId {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }

  static of(value: string): ReservationId {
    if (!value || !ID_REGEX.test(value)) {
      throw new Error(`Invalid ReservationId: ${value}`);
    }
    return new ReservationId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ReservationId): boolean {
    return other instanceof ReservationId && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}

/**
 * ReservationLineRef — bir reservation içindeki bir kalem (product + location
 * kombinasyonu). Reservation aggregate'ı birden fazla satır tutar; her satır
 * bir ürün + lokasyon + miktar kombinasyonu.
 */
export class ReservationLineRef {
  private constructor(
    private readonly productId: string,
    private readonly locationId: string,
    private readonly lotId: string | null,
  ) {
    Object.freeze(this);
  }

  static of(productId: string, locationId: string, lotId: string | null = null): ReservationLineRef {
    if (!productId) throw new Error('ReservationLineRef requires productId');
    if (!locationId) throw new Error('ReservationLineRef requires locationId');
    return new ReservationLineRef(productId, locationId, lotId);
  }

  getProductId(): string {
    return this.productId;
  }

  getLocationId(): string {
    return this.locationId;
  }

  getLotId(): string | null {
    return this.lotId;
  }

  equals(other: ReservationLineRef): boolean {
    return (
      other instanceof ReservationLineRef &&
      this.productId === other.productId &&
      this.locationId === other.locationId &&
      this.lotId === other.lotId
    );
  }

  toJSON(): { productId: string; locationId: string; lotId: string | null } {
    return { productId: this.productId, locationId: this.locationId, lotId: this.lotId };
  }
}
