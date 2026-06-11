/**
 * Lot — Immutable per-batch stock record
 *
 * Represents a single batch of a product at a location with:
 *   - An expiry (optional, for perishable/regulated goods)
 *   - A mfgDate (optional, for traceability)
 *   - quantityOnHand (lot-level quantity, separate from unit serials)
 *   - Status (AVAILABLE / QUARANTINED / EXPIRED / DEPLETED)
 *   - Optional serial numbers (one per unit for serialized goods)
 *
 * Quantity is held as a string (decimal-safe: "100.000") for consistency
 * with the existing Quantity VO. Operations produce a new lot snapshot
 * (FEFO dispatch consumes from a lot by creating a new lot with reduced
 * quantity + new status, never mutating in place).
 */
import { ExpiryDate } from '../value-objects/ExpiryDate';
import { LotId } from '../value-objects/LotId';
import { LotStatus } from '../value-objects/LotStatus';
import { SerialNumber } from '../value-objects/SerialNumber';

export interface LotProps {
  id: LotId;
  productId: string;
  locationId: string;
  quantityOnHand: string; // decimal string, e.g. "100.000"
  uom: string; // unit-of-measure
  status: LotStatus;
  expiryDate: ExpiryDate;
  mfgDate: Date | null;
  receivedAt: Date;
  supplierLotCode: string | null; // external supplier's lot code (optional)
  serialNumbers: ReadonlyArray<SerialNumber>;
  notes: string | null;
  version: number;
}

export class Lot {
  private constructor(private readonly props: LotProps) {
    Object.freeze(this.props.serialNumbers);
    Object.freeze(this);
  }

  static create(props: LotProps): Lot {
    if (Number(props.quantityOnHand) < 0) {
      throw new Error(`Lot quantityOnHand cannot be negative: ${props.quantityOnHand}`);
    }
    if (!props.uom || props.uom.trim() === '') {
      throw new Error('Lot uom is required');
    }
    if (props.serialNumbers.length > 0) {
      const distinct = new Set(props.serialNumbers.map((s) => s.getValue()));
      if (distinct.size !== props.serialNumbers.length) {
        throw new Error('Serial numbers must be unique within a lot');
      }
    }
    return new Lot(props);
  }

  getId(): LotId {
    return this.props.id;
  }
  getProductId(): string {
    return this.props.productId;
  }
  getLocationId(): string {
    return this.props.locationId;
  }
  getQuantityOnHand(): string {
    return this.props.quantityOnHand;
  }
  getUom(): string {
    return this.props.uom;
  }
  getStatus(): LotStatus {
    return this.props.status;
  }
  getExpiryDate(): ExpiryDate {
    return this.props.expiryDate;
  }
  getMfgDate(): Date | null {
    return this.props.mfgDate;
  }
  getReceivedAt(): Date {
    return this.props.receivedAt;
  }
  getSupplierLotCode(): string | null {
    return this.props.supplierLotCode;
  }
  getSerialNumbers(): ReadonlyArray<SerialNumber> {
    return this.props.serialNumbers;
  }
  getNotes(): string | null {
    return this.props.notes;
  }
  getVersion(): number {
    return this.props.version;
  }

  isDispatchable(): boolean {
    return this.props.status.isDispatchable();
  }

  isExpired(at: Date): boolean {
    return this.props.expiryDate.isExpiredAt(at);
  }

  isDepleted(): boolean {
    return Number(this.props.quantityOnHand) === 0;
  }

  /**
   * Return a new lot snapshot with reduced quantity (immutability).
   * Caller is responsible for persistence + domain event emission.
   */
  consume(amount: string): Lot {
    const current = Number(this.props.quantityOnHand);
    const delta = Number(amount);
    if (delta <= 0) {
      throw new Error(`Consume amount must be positive: ${amount}`);
    }
    if (delta > current) {
      throw new Error(`Cannot consume ${amount} from lot with ${this.props.quantityOnHand}`);
    }
    const newQty = (current - delta).toFixed(3);
    const newStatus = Number(newQty) === 0 ? LotStatus.depleted() : this.props.status;
    return Lot.create({
      ...this.props,
      quantityOnHand: newQty,
      status: newStatus,
      version: this.props.version + 1,
    });
  }

  /**
   * Return a new lot snapshot with status changed.
   */
  withStatus(newStatus: LotStatus): Lot {
    if (!this.props.status.canTransitionTo(newStatus)) {
      throw new Error(`Cannot transition lot from ${this.props.status} to ${newStatus}`);
    }
    return Lot.create({ ...this.props, status: newStatus, version: this.props.version + 1 });
  }

  /**
   * Return a new lot snapshot with a quantity increase (e.g. return-to-stock).
   */
  addQuantity(amount: string): Lot {
    const current = Number(this.props.quantityOnHand);
    const delta = Number(amount);
    if (delta <= 0) {
      throw new Error(`Add amount must be positive: ${amount}`);
    }
    const newQty = (current + delta).toFixed(3);
    return Lot.create({ ...this.props, quantityOnHand: newQty, version: this.props.version + 1 });
  }

  /**
   * FEFO comparator: earlier expiry = lower score = sorted first.
   * Secondary: earlier receivedAt.
   */
  compareFefo(other: Lot): number {
    const a = this.props.expiryDate.sortKey() - other.props.expiryDate.sortKey();
    if (a !== 0) return a;
    return this.props.receivedAt.getTime() - other.props.receivedAt.getTime();
  }
}
