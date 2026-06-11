/**
 * Reservation Aggregate
 *
 * Bir müşteri siparişinin (SalesOrder) onaylanmasıyla oluşturulan stok
 * rezervasyonu. InventoryLevel aggregate'ı üzerinde iki taraf:
 *
 *   - HELD (oluşturulduğunda)  : inventoryLevel.reserved += qty
 *   - COMMITTED (ödeme sonrası): inventoryLevel.onHand  -= qty, reserved -= qty
 *   - RELEASED (iptal/expired) : inventoryLevel.reserved -= qty
 *
 * Identity: reservationId
 * Concurrency: optimistic lock (`version`)
 *
 * Lifecycle: HELD → COMMITTED | RELEASED | EXPIRED
 *
 * Lines: bir reservation birden fazla product-location kombinasyonu tutabilir
 * (siparişteki tüm satırlar tek reservation altında toplanır).
 */
import { AggregateRoot } from '../entities/AggregateRoot';
import { ReservationId } from '../value-objects/ReservationId';
import { ReservationStatus } from '../value-objects/ReservationStatus';
import { ReservationLine } from '../entities/ReservationLine';
import {
  ReservationCreatedEvent,
  ReservationCommittedEvent,
  ReservationReleasedEvent,
} from '../events/ReservationEvents';

export interface ReservationProps {
  id: ReservationId;
  /** Kaynak sipariş (SalesOrder) — referans. */
  orderId: string;
  /** İsteğe bağlı müşteri başvurusu. */
  customerId: string;
  status: ReservationStatus;
  lines: ReadonlyArray<ReservationLine>;
  expiresAt: Date | null; // opsiyonel TTL; null = open-ended
  createdAt: Date;
  updatedAt: Date;
  committedAt: Date | null;
  releasedAt: Date | null;
  version: number;
  notes: string | null;
}

export class Reservation extends AggregateRoot {
  private constructor(private readonly props: ReservationProps) {
    super();
    Object.freeze(this.props.lines);
  }

  static create(params: {
    id: string;
    orderId: string;
    customerId: string;
    lines: ReadonlyArray<ReservationLine>;
    expiresAt?: Date | null;
    notes?: string | null;
  }): Reservation {
    if (!params.orderId) throw new Error('Reservation requires orderId');
    if (!params.customerId) throw new Error('Reservation requires customerId');
    if (!params.lines || params.lines.length === 0) {
      throw new Error('Reservation requires at least one line');
    }
    const now = new Date();
    const reservation = new Reservation({
      id: ReservationId.of(params.id),
      orderId: params.orderId,
      customerId: params.customerId,
      status: ReservationStatus.held(),
      lines: params.lines,
      expiresAt: params.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
      committedAt: null,
      releasedAt: null,
      version: 1,
      notes: params.notes ?? null,
    });
    reservation.addDomainEvent(
      new ReservationCreatedEvent({
        reservationId: params.id,
        orderId: params.orderId,
        customerId: params.customerId,
        lines: params.lines.map((l) => ({
          productId: l.getProductId(),
          locationId: l.getLocationId(),
          lotId: l.getLotId(),
          quantity: l.getReservedQuantity(),
          uom: l.getUom(),
          lotAllocations: l.getLotAllocations().map((a) => ({
            lotId: a.lotId,
            quantity: a.quantity,
          })),
        })),
        expiresAt: params.expiresAt ?? null,
        occurredAt: now,
      }),
    );
    return reservation;
  }

  static reconstitute(props: ReservationProps): Reservation {
    return new Reservation(props);
  }

  // ── Lifecycle transitions ──

  /**
   * Mark the reservation as committed (stok gerçekten sevkedildi).
   * Çağıran taraf aynı zamanda her bir inventoryLevel.applyCommit() yapar
   * (onHand -= qty, reserved -= qty).
   */
  commit(): Reservation {
    if (!this.props.status.canTransitionTo(ReservationStatus.committed())) {
      throw new Error(
        `Cannot commit reservation in status ${this.props.status.toString()}`,
      );
    }
    const next = this.mutate({
      status: ReservationStatus.committed(),
      committedAt: new Date(),
    });
    next.addDomainEvent(
      new ReservationCommittedEvent({
        reservationId: this.props.id.getValue(),
        orderId: this.props.orderId,
        lines: this.props.lines.map((l) => ({
          productId: l.getProductId(),
          locationId: l.getLocationId(),
          quantity: l.getReservedQuantity(),
        })),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  /**
   * Release the reservation (stok rezerve olmaktan çıktı).
   * Çağıran taraf her bir inventoryLevel.release() yapar (reserved -= qty).
   */
  release(reason: string = 'manual'): Reservation {
    if (!this.props.status.canTransitionTo(ReservationStatus.released())) {
      throw new Error(
        `Cannot release reservation in status ${this.props.status.toString()}`,
      );
    }
    const next = this.mutate({
      status: ReservationStatus.released(),
      releasedAt: new Date(),
    });
    next.addDomainEvent(
      new ReservationReleasedEvent({
        reservationId: this.props.id.getValue(),
        orderId: this.props.orderId,
        reason,
        lines: this.props.lines.map((l) => ({
          productId: l.getProductId(),
          locationId: l.getLocationId(),
          quantity: l.getReservedQuantity(),
        })),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  /** Mark reservation as expired (otomatik TTL aşımı). */
  expire(): Reservation {
    if (!this.props.status.canTransitionTo(ReservationStatus.expired())) {
      throw new Error(
        `Cannot expire reservation in status ${this.props.status.toString()}`,
      );
    }
    const next = this.mutate({
      status: ReservationStatus.expired(),
      releasedAt: new Date(),
    });
    next.addDomainEvent(
      new ReservationReleasedEvent({
        reservationId: this.props.id.getValue(),
        orderId: this.props.orderId,
        reason: 'expired',
        lines: this.props.lines.map((l) => ({
          productId: l.getProductId(),
          locationId: l.getLocationId(),
          quantity: l.getReservedQuantity(),
        })),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  // ── Getters ──

  getId(): ReservationId {
    return this.props.id;
  }

  getOrderId(): string {
    return this.props.orderId;
  }

  getCustomerId(): string {
    return this.props.customerId;
  }

  getStatus(): ReservationStatus {
    return this.props.status;
  }

  getLines(): ReadonlyArray<ReservationLine> {
    return this.props.lines;
  }

  getExpiresAt(): Date | null {
    return this.props.expiresAt;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  getCommittedAt(): Date | null {
    return this.props.committedAt;
  }

  getReleasedAt(): Date | null {
    return this.props.releasedAt;
  }

  getVersion(): number {
    return this.props.version;
  }

  getNotes(): string | null {
    return this.props.notes;
  }

  isExpired(asOf: Date = new Date()): boolean {
    if (!this.props.expiresAt) return false;
    return this.props.expiresAt.getTime() <= asOf.getTime();
  }

  // ── Helpers ──

  private mutate(partial: Partial<ReservationProps>): Reservation {
    return new Reservation({
      ...this.props,
      ...partial,
      updatedAt: new Date(),
      version: this.props.version + 1,
    });
  }
}
