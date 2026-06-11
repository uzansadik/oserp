/**
 * Queries: Reservation
 */
import type { ReservationView } from '../dto/ReservationDTOs';

export interface ListReservationsQuery {
  orderId?: string;
  customerId?: string;
  status?: string;
  locationId?: string;
  productId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ReservationListResult {
  ok: boolean;
  reservations?: ReadonlyArray<ReservationView>;
  total?: number;
  error?: string;
}
