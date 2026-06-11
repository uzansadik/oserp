/**
 * In-memory ReservationRepository. Tests / dev.
 */
import type { Reservation } from '@oserp-community/inventory/domain/aggregates/Reservation';
import type { ReservationId } from '@oserp-community/inventory/domain/value-objects/ReservationId';
import type {
  ReservationRepository,
  ReservationSearchCriteria,
} from '@oserp-community/inventory/application/ports/ReservationRepositoryPort';

export class InMemoryReservationRepository implements ReservationRepository {
  private readonly byId = new Map<string, Reservation>();

  async save(reservation: Reservation): Promise<void> {
    this.byId.set(reservation.getId().getValue(), reservation);
  }

  async update(reservation: Reservation): Promise<void> {
    this.byId.set(reservation.getId().getValue(), reservation);
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    return this.byId.get(id.getValue()) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Reservation | null> {
    for (const r of this.byId.values()) {
      if (r.getOrderId() === orderId) return r;
    }
    return null;
  }

  async search(criteria: ReservationSearchCriteria): Promise<ReadonlyArray<Reservation>> {
    let arr = Array.from(this.byId.values());
    if (criteria.orderId) {
      arr = arr.filter((r) => r.getOrderId() === criteria.orderId);
    }
    if (criteria.customerId) {
      arr = arr.filter((r) => r.getCustomerId() === criteria.customerId);
    }
    if (criteria.status) {
      arr = arr.filter((r) => r.getStatus().getKind() === criteria.status);
    }
    if (criteria.activeOnly) {
      arr = arr.filter(
        (r) =>
          r.getStatus().getKind() === 'HELD',
      );
    }
    if (criteria.productId) {
      arr = arr.filter((r) =>
        r.getLines().some((l) => l.getProductId() === criteria.productId),
      );
    }
    if (criteria.locationId) {
      arr = arr.filter((r) =>
        r.getLines().some((l) => l.getLocationId() === criteria.locationId),
      );
    }
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? arr.length;
    return arr.slice(offset, offset + limit);
  }
}
