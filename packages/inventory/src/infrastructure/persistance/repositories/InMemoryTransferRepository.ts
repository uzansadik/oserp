/**
 * In-memory TransferRepository. Tests / dev.
 */
import type { TransferOrder } from '@oserp-community/inventory/domain/aggregates/TransferOrder';
import type { TransferId } from '@oserp-community/inventory/domain/value-objects/TransferId';
import type {
  TransferRepository,
  TransferSearchCriteria,
} from '@oserp-community/inventory/application/ports/TransferRepositoryPort';

export class InMemoryTransferRepository implements TransferRepository {
  private readonly byId = new Map<string, TransferOrder>();
  private counter = 7000;

  async save(transfer: TransferOrder): Promise<void> {
    this.byId.set(transfer.getId().getValue(), transfer);
  }

  async update(transfer: TransferOrder): Promise<void> {
    this.byId.set(transfer.getId().getValue(), transfer);
  }

  async findById(id: TransferId): Promise<TransferOrder | null> {
    return this.byId.get(id.getValue()) ?? null;
  }

  async findByTransferNumber(transferNumber: string): Promise<TransferOrder | null> {
    for (const t of this.byId.values()) {
      if (t.getTransferNumber() === transferNumber) return t;
    }
    return null;
  }

  async search(criteria: TransferSearchCriteria): Promise<ReadonlyArray<TransferOrder>> {
    let arr = Array.from(this.byId.values());
    if (criteria.sourceLocationId) {
      arr = arr.filter((t) => t.getSourceLocation().getLocationId() === criteria.sourceLocationId);
    }
    if (criteria.destinationLocationId) {
      arr = arr.filter(
        (t) => t.getDestinationLocation().getLocationId() === criteria.destinationLocationId,
      );
    }
    if (criteria.status) {
      arr = arr.filter((t) => t.getStatus().getKind() === criteria.status);
    }
    if (criteria.inFlightOnly) {
      arr = arr.filter((t) => t.getStatus().isInFlight());
    }
    if (criteria.productId) {
      arr = arr.filter((t) =>
        t.getLines().some((l) => l.getProductId() === criteria.productId),
      );
    }
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? arr.length;
    return arr.slice(offset, offset + limit);
  }

  async nextTransferNumber(): Promise<string> {
    this.counter += 1;
    return `TR-${this.counter}`;
  }
}
