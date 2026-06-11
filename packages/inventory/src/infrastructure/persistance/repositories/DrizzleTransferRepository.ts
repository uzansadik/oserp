/**
 * DrizzleTransferRepository — Postgres persistence.
 */
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { TransferOrder } from '@oserp-community/inventory/domain/aggregates/TransferOrder';
import type { TransferId } from '@oserp-community/inventory/domain/value-objects/TransferId';
import type {
  TransferRepository,
  TransferSearchCriteria,
} from '@oserp-community/inventory/application/ports/TransferRepositoryPort';
import {
  transfers,
  transferLines,
} from '../schemas/inv.transfer.schema';
import type { InventoryDbClient } from '../db';
import { TransferMapper } from '../mappers/TransferMapper';

export class DrizzleTransferRepository implements TransferRepository {
  constructor(private readonly db: InventoryDbClient) {}

  async save(transfer: TransferOrder): Promise<void> {
    const header = TransferMapper.toHeaderRow(transfer);
    await this.db.insert(transfers).values(header);
    for (const line of transfer.getLines()) {
      const row = TransferMapper.toLineRow(transfer.getId().getValue(), line);
      row.id = `${transfer.getId().getValue()}::${line.getProductId()}::${randomUUID().slice(0, 8)}`;
      await this.db.insert(transferLines).values(row);
    }
  }

  async update(transfer: TransferOrder): Promise<void> {
    const header = TransferMapper.toHeaderRow(transfer);
    await this.db
      .update(transfers)
      .set({
        status: header.status,
        reason: header.reason,
        notes: header.notes,
        updatedAt: header.updatedAt,
        dispatchedAt: header.dispatchedAt,
        receivedAt: header.receivedAt,
        closedAt: header.closedAt,
        cancelledAt: header.cancelledAt,
        version: header.version,
      })
      .where(eq(transfers.id, header.id));
  }

  async findById(id: TransferId): Promise<TransferOrder | null> {
    const header = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, id.getValue()))
      .limit(1);
    if (header.length === 0) return null;
    const lines = await this.db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, id.getValue()));
    return TransferMapper.toDomain(header[0]!, lines);
  }

  async findByTransferNumber(transferNumber: string): Promise<TransferOrder | null> {
    const header = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.transferNumber, transferNumber))
      .limit(1);
    if (header.length === 0) return null;
    const lines = await this.db
      .select()
      .from(transferLines)
      .where(eq(transferLines.transferId, header[0]!.id));
    return TransferMapper.toDomain(header[0]!, lines);
  }

  async search(criteria: TransferSearchCriteria): Promise<ReadonlyArray<TransferOrder>> {
    const conditions = [];
    if (criteria.sourceLocationId) {
      conditions.push(eq(transfers.sourceLocationId, criteria.sourceLocationId));
    }
    if (criteria.destinationLocationId) {
      conditions.push(eq(transfers.destinationLocationId, criteria.destinationLocationId));
    }
    if (criteria.status) {
      conditions.push(eq(transfers.status, criteria.status));
    }
    if (criteria.inFlightOnly) {
      conditions.push(sql`${transfers.status} IN ('DISPATCHED', 'IN_TRANSIT', 'RECEIVED')`);
    }

    const where = conditions.length === 0 ? undefined : and(...conditions);
    const headerRows = await this.db
      .select()
      .from(transfers)
      .where(where)
      .limit(criteria.limit ?? 100)
      .offset(criteria.offset ?? 0);

    const results: TransferOrder[] = [];
    for (const h of headerRows) {
      const lineRows = await this.db
        .select()
        .from(transferLines)
        .where(eq(transferLines.transferId, h.id));
      let t = TransferMapper.toDomain(h, lineRows);
      if (criteria.productId && !t.getLines().some((l) => l.getProductId() === criteria.productId)) {
        continue;
      }
      results.push(t);
    }
    return results;
  }

  async nextTransferNumber(): Promise<string> {
    // Postgres sequence davranışı: SELECT MAX + increment
    const r = await this.db
      .select({ max: sql<string>`COALESCE(MAX(${transfers.transferNumber}), 'TR-7000')` })
      .from(transfers);
    const current = r[0]?.max ?? 'TR-7000';
    const match = current.match(/TR-(\d+)/);
    const next = match ? Number(match[1]) + 1 : 7001;
    return `TR-${next}`;
  }
}
