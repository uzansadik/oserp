// packages/inventory/src/infrastructure/persistance/mappers/ReservationMapper.ts
//
// Reservation aggregate ↔ DB row dönüşümleri. ReservationLine'lar ayrı
// satır tablosunda tutulur; mapper hydrate/dehydrate sırasında ikisini
// birlikte ele alır.

import { Reservation, type ReservationProps } from '@oserp-community/inventory/domain/aggregates/Reservation';
import { ReservationLine } from '@oserp-community/inventory/domain/entities/ReservationLine';
import { ReservationLineRef, ReservationId } from '@oserp-community/inventory/domain/value-objects/ReservationId';
import { ReservationStatus } from '@oserp-community/inventory/domain/value-objects/ReservationStatus';
import type {
  InvReservationRow,
  InvReservationLineRow,
  InvReservationLineInsert,
} from '../schemas/inv.reservation.schema';

export interface ReservationDbSnapshot {
  header: InvReservationRow;
  lines: ReadonlyArray<InvReservationLineRow>;
}

export const ReservationMapper = {
  toDomain(header: InvReservationRow, lines: ReadonlyArray<InvReservationLineRow>): Reservation {
    const reservationLines = lines.map((row) =>
      ReservationLine.create({
        ref: ReservationLineRef.of(row.productId, row.locationId, row.lotId),
        reservedQuantity: row.quantity,
        uom: row.uom,
        lotAllocations: row.lotAllocations as Array<{ lotId: string | null; quantity: string }>,
        notes: row.notes,
      }),
    );
    const props: ReservationProps = {
      id: ReservationId.of(header.id),
      orderId: header.orderId,
      customerId: header.customerId,
      status: ReservationStatus.fromKind(header.status as 'HELD' | 'COMMITTED' | 'RELEASED' | 'EXPIRED'),
      lines: reservationLines,
      expiresAt: header.expiresAt,
      createdAt: header.createdAt,
      updatedAt: header.updatedAt,
      committedAt: header.committedAt,
      releasedAt: header.releasedAt,
      version: header.version,
      notes: header.notes,
    };
    return Reservation.reconstitute(props);
  },

  toHeaderRow(reservation: Reservation): InvReservationRow {
    return {
      id: reservation.getId().getValue(),
      orderId: reservation.getOrderId(),
      customerId: reservation.getCustomerId(),
      status: reservation.getStatus().getKind(),
      expiresAt: reservation.getExpiresAt(),
      notes: reservation.getNotes(),
      createdAt: reservation.getCreatedAt(),
      updatedAt: reservation.getUpdatedAt(),
      committedAt: reservation.getCommittedAt(),
      releasedAt: reservation.getReleasedAt(),
      version: reservation.getVersion(),
    };
  },

  toLineRow(
    reservationId: string,
    line: ReservationLine,
  ): InvReservationLineInsert {
    return {
      // ID: reservationId + productId + locationId (composite) — service caller'da üretilebilir
      id: '', // service tarafından doldurulacak
      reservationId,
      productId: line.getProductId(),
      locationId: line.getLocationId(),
      lotId: line.getLotId(),
      quantity: line.getReservedQuantity(),
      uom: line.getUom(),
      lotAllocations: line.getLotAllocations().map((a) => ({
        lotId: a.lotId,
        quantity: a.quantity,
      })),
      notes: line.getNotes(),
    };
  },
};
