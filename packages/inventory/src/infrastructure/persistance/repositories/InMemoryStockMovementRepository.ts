import type { StockMovement } from '@oserp-community/inventory/domain/entities/StockMovement';
import type { MovementId } from '@oserp-community/inventory/domain/value-objects/MovementId';
import type {
  ListMovementsFilter,
  ListMovementsResult,
  StockMovementRepositoryPort,
} from '@oserp-community/inventory/application/ports/StockMovementRepositoryPort';

/**
 * In-memory StockMovement repository — test'ler için.
 */
export class InMemoryStockMovementRepository implements StockMovementRepositoryPort {
  private readonly byId = new Map<string, StockMovement>();

  async save(movement: StockMovement): Promise<void> {
    this.byId.set(movement.getId().toString(), movement);
  }

  async findById(id: MovementId): Promise<StockMovement | null> {
    return this.byId.get(id.toString()) ?? null;
  }

  async list(filter: ListMovementsFilter): Promise<ListMovementsResult> {
    let arr = Array.from(this.byId.values());
    if (filter.productId) {
      arr = arr.filter((m) =>
        m.getLines().some((l) => l.getProductId().toString() === filter.productId),
      );
    }
    if (filter.type) {
      arr = arr.filter((m) => m.getType().getValue() === filter.type!.getValue());
    }
    if (filter.fromLocationId) {
      arr = arr.filter((m) =>
        m.getLines().some((l) => l.getFromLocation()?.getLocationId() === filter.fromLocationId),
      );
    }
    if (filter.toLocationId) {
      arr = arr.filter((m) =>
        m.getLines().some((l) => l.getToLocation()?.getLocationId() === filter.toLocationId),
      );
    }
    if (filter.from) {
      const from = filter.from;
      arr = arr.filter((m) => m.getPostedAt() >= from);
    }
    if (filter.to) {
      const to = filter.to;
      arr = arr.filter((m) => m.getPostedAt() <= to);
    }
    arr.sort((a, b) => b.getPostedAt().getTime() - a.getPostedAt().getTime());
    const total = arr.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    return { movements: arr.slice(offset, offset + limit), total };
  }
}
