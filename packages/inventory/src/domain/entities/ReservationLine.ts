/**
 * ReservationLine — reservation içindeki immutable bir kalem.
 *
 * Bir satır = (productId, locationId, lotId?) + reservedQuantity +
 * (opsiyonel) commit/release bilgisi.
 *
 * Reservation oluşturulduğunda her line, FEFO stratejisi ile seçilen lot'a
 * karşılık gelir (lotId dolu olabilir veya "herhangi bir lot" anlamında
 * null olabilir — MVP'de her zaman FEFO ile seçilir).
 */
import { ReservationLineRef } from '../value-objects/ReservationId';

export interface ReservationLineProps {
  ref: ReservationLineRef;
  reservedQuantity: string; // decimal string
  uom: string; // unit-of-measure
  /** Lot bazında FEFO tarafından seçilen lotlar (qty breakdown). */
  lotAllocations: ReadonlyArray<{
    lotId: string | null;
    quantity: string;
  }>;
  notes: string | null;
}

export class ReservationLine {
  private constructor(private readonly props: ReservationLineProps) {
    Object.freeze(this.props);
    Object.freeze(this.props.lotAllocations);
  }

  static create(props: ReservationLineProps): ReservationLine {
    if (!props.ref) throw new Error('ReservationLine requires ref');
    if (!props.reservedQuantity || Number(props.reservedQuantity) <= 0) {
      throw new Error(`ReservationLine reservedQuantity must be positive: ${props.reservedQuantity}`);
    }
    if (!props.uom || props.uom.trim() === '') {
      throw new Error('ReservationLine uom is required');
    }
    if (props.lotAllocations.length === 0) {
      throw new Error('ReservationLine must have at least one lot allocation (FEFO result)');
    }
    // Validate: allocations sum to reservedQuantity
    const totalAllocated = props.lotAllocations.reduce(
      (s, a) => s + Number(a.quantity),
      0,
    );
    if (Math.abs(totalAllocated - Number(props.reservedQuantity)) > 0.001) {
      throw new Error(
        `ReservationLine lotAllocations sum (${totalAllocated}) != reservedQuantity (${props.reservedQuantity})`,
      );
    }
    return new ReservationLine(props);
  }

  getRef(): ReservationLineRef {
    return this.props.ref;
  }

  getProductId(): string {
    return this.props.ref.getProductId();
  }

  getLocationId(): string {
    return this.props.ref.getLocationId();
  }

  getLotId(): string | null {
    return this.props.ref.getLotId();
  }

  getReservedQuantity(): string {
    return this.props.reservedQuantity;
  }

  getUom(): string {
    return this.props.uom;
  }

  getLotAllocations(): ReadonlyArray<{ lotId: string | null; quantity: string }> {
    return this.props.lotAllocations;
  }

  getNotes(): string | null {
    return this.props.notes;
  }

  equals(other: ReservationLine): boolean {
    return other instanceof ReservationLine && this.props.ref.equals(other.props.ref);
  }
}
