/**
 * DrizzleReservationRepository — Postgres persistence.
 */
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Reservation } from '@oserp-community/inventory/domain/aggregates/Reservation';
import type { ReservationId } from '@oserp-community/inventory/domain/value-objects/ReservationId';
import type {
  ReservationRepository,
  ReservationSearchCriteria,
} from '@oserp-community/inventory/application/ports/ReservationRepositoryPort';
import {
  reservations,
  reservationLines,
} from '../schemas/inv.reservation.schema';
import type { InventoryDbClient } from '../db';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class DrizzleReservationRepository implements ReservationRepository {
  constructor(private readonly db: InventoryDbClient) {}

  async save(reservation: Reservation): Promise<void> {
    const header = ReservationMapper.toHeaderRow(reservation);
    await this.db.insert(reservations).values(header);
    for (const line of reservation.getLines()) {
      const row = ReservationMapper.toLineRow(reservation.getId().getValue(), line);
      row.id = `${reservation.getId().getValue()}::${line.getProductId()}::${line.getLocationId()}::${randomUUID().slice(0, 8)}`;
      await this.db.insert(reservationLines).values(row);
    }
  }

  async update(reservation: Reservation): Promise<void> {
    const header = ReservationMapper.toHeaderRow(reservation);
    await this.db
      .update(reservations)
      .set({
        status: header.status,
        expiresAt: header.expiresAt,
        notes: header.notes,
        updatedAt: header.updatedAt,
        committedAt: header.committedAt,
        releasedAt: header.releasedAt,
        version: header.version,
      })
      .where(eq(reservations.id, header.id));
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const header = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id.getValue()))
      .limit(1);
    if (header.length === 0) return null;
    const lines = await this.db
      .select()
      .from(reservationLines)
      .where(eq(reservationLines.reservationId, id.getValue()));
    return ReservationMapper.toDomain(header[0]!, lines);
  }

  async findByOrderId(orderId: string): Promise<Reservation | null> {
    const header = await this.db
      .select()
      .from(reservations)
      .where(eq(reservations.orderId, orderId))
      .limit(1);
    if (header.length === 0) return null;
    const lines = await this.db
      .select()
      .from(reservationLines)
      .where(eq(reservationLines.reservationId, header[0]!.id));
    return ReservationMapper.toDomain(header[0]!, lines);
  }

  async search(criteria: ReservationSearchCriteria): Promise<ReadonlyArray<Reservation>> {
    const conditions = [];
    if (criteria.orderId) conditions.push(eq(reservations.orderId, criteria.orderId));
    if (criteria.customerId) conditions.push(eq(reservations.customerId, criteria.customerId));
    if (criteria.status) conditions.push(eq(reservations.status, criteria.status));
    if (criteria.activeOnly) conditions.push(eq(reservations.status, 'HELD'));

    const where = conditions.length === 0 ? undefined : and(...conditions);
    const headerRows = await this.db
      .select()
      .from(reservations)
      .where(where)
      .limit(criteria.limit ?? 100)
      .offset(criteria.offset ?? 0);

    const results: Reservation[] = [];
    for (const h of headerRows) {
      const lineRows = await this.db
        .select()
        .from(reservationLines)
        .where(eq(reservationLines.reservationId, h.id));
      let r = ReservationMapper.toDomain(h, lineRows);
      if (criteria.productId && !r.getLines().some((l) => l.getProductId() === criteria.productId)) {
        continue;
      }
      if (criteria.locationId && !r.getLines().some((l) => l.getLocationId() === criteria.locationId)) {
        continue;
      }
      results.push(r);
    }
    return results;
  }
}
