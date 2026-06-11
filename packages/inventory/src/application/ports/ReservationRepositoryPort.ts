/**
 * Port: ReservationRepository
 *
 * Reservation aggregate'ı için kalıcılık soyutlaması.
 * Implementations: InMemoryReservationRepository, DrizzleReservationRepository.
 */
import { Reservation } from '../../domain/aggregates/Reservation';
import { ReservationId } from '../../domain/value-objects/ReservationId';

export interface ReservationSearchCriteria {
  orderId?: string;
  customerId?: string;
  status?: string;
  locationId?: string;
  productId?: string;
  /** Sadece HELD olanlar (rezerve, henüz sevkedilmemiş). */
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ReservationRepository {
  save(reservation: Reservation): Promise<void>;
  update(reservation: Reservation): Promise<void>;
  findById(id: ReservationId): Promise<Reservation | null>;
  findByOrderId(orderId: string): Promise<Reservation | null>;
  search(criteria: ReservationSearchCriteria): Promise<ReadonlyArray<Reservation>>;
}
