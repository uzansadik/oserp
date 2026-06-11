/**
 * DTOs: Reservation
 */
import { Reservation } from '../../domain/aggregates/Reservation';

export interface CreateReservationDTO {
  id: string;
  orderId: string;
  customerId: string;
  /** Sipariş satırları — her biri productId+locationId+quantity+uom */
  lines: ReadonlyArray<{
    productId: string;
    locationId: string;
    /** Opsiyonel: belirli bir lot zorunlu ise. Yoksa FEFO otomatik seçer. */
    lotId?: string | null;
    quantity: string;
    uom: string;
  }>;
  expiresAt?: Date | string | null;
  notes?: string | null;
}

export interface ReleaseReservationDTO {
  reservationId: string;
  reason?: string;
}

export interface CommitReservationDTO {
  reservationId: string;
}

export interface ReservationLineView {
  productId: string;
  locationId: string;
  lotId: string | null;
  quantity: string;
  uom: string;
  lotAllocations: ReadonlyArray<{ lotId: string | null; quantity: string }>;
}

export interface ReservationView {
  id: string;
  orderId: string;
  customerId: string;
  status: string;
  lines: ReservationLineView[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  committedAt: string | null;
  releasedAt: string | null;
  version: number;
  notes: string | null;
}

export function reservationToView(r: Reservation): ReservationView {
  return {
    id: r.getId().getValue(),
    orderId: r.getOrderId(),
    customerId: r.getCustomerId(),
    status: r.getStatus().getKind(),
    lines: r.getLines().map((l) => ({
      productId: l.getProductId(),
      locationId: l.getLocationId(),
      lotId: l.getLotId(),
      quantity: l.getReservedQuantity(),
      uom: l.getUom(),
      lotAllocations: l.getLotAllocations(),
    })),
    expiresAt: r.getExpiresAt() ? r.getExpiresAt()!.toISOString() : null,
    createdAt: r.getCreatedAt().toISOString(),
    updatedAt: r.getUpdatedAt().toISOString(),
    committedAt: r.getCommittedAt() ? r.getCommittedAt()!.toISOString() : null,
    releasedAt: r.getReleasedAt() ? r.getReleasedAt()!.toISOString() : null,
    version: r.getVersion(),
    notes: r.getNotes(),
  };
}
