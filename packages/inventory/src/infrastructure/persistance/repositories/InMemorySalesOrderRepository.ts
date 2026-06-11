/**
 * In-memory SalesOrderRepository. Tests / dev.
 */
import type { SalesOrder } from '@oserp-community/inventory/domain/aggregates/SalesOrder';
import type { SalesOrderId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import type {
  SalesOrderRepository,
  SalesOrderSearchCriteria,
} from '@oserp-community/inventory/application/ports/SalesOrderRepositoryPort';

export class InMemorySalesOrderRepository implements SalesOrderRepository {
  private readonly byId = new Map<string, SalesOrder>();
  private orderCounter = 1000;

  async save(order: SalesOrder): Promise<void> {
    this.byId.set(order.getId().getValue(), order);
  }
  async findById(id: SalesOrderId): Promise<SalesOrder | null> {
    return this.byId.get(id.getValue()) ?? null;
  }
  async findByOrderNumber(orderNumber: string): Promise<SalesOrder | null> {
    for (const o of this.byId.values()) {
      if (o.getOrderNumber() === orderNumber) return o;
    }
    return null;
  }
  async search(criteria: SalesOrderSearchCriteria): Promise<ReadonlyArray<SalesOrder>> {
    let arr = Array.from(this.byId.values());
    if (criteria.customerId) {
      arr = arr.filter((o) => o.getCustomer().getCustomerId() === criteria.customerId);
    }
    if (criteria.status) {
      arr = arr.filter((o) => o.getStatus().getKind() === criteria.status);
    }
    if (criteria.from) {
      arr = arr.filter((o) => o.getCreatedAt() >= criteria.from!);
    }
    if (criteria.to) {
      arr = arr.filter((o) => o.getCreatedAt() <= criteria.to!);
    }
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? arr.length;
    return arr.slice(offset, offset + limit);
  }
  async nextOrderNumber(): Promise<string> {
    this.orderCounter += 1;
    return `SO-${this.orderCounter}`;
  }
}
