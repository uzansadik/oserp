/**
 * Drizzle SalesOrderRepository — full Postgres impl.
 *
 * Replace semantics: delete all lines for the order, then re-insert.
 * Order header is upserted.
 */
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import type { InventoryDb } from '../db';
import { salesOrders, orderLines } from '../schemas/inv.sales-order.schema';
import { OrderLine } from '@oserp-community/inventory/domain/entities/OrderLine';
import { SalesOrder, type SalesOrderProps } from '@oserp-community/inventory/domain/aggregates/SalesOrder';
import { CustomerRef, SalesOrderId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { OrderStatus } from '@oserp-community/inventory/domain/value-objects/SalesStatus';
import type {
  SalesOrderRepository,
  SalesOrderSearchCriteria,
} from '@oserp-community/inventory/application/ports/SalesOrderRepositoryPort';

export class DrizzleSalesOrderRepository implements SalesOrderRepository {
  private orderCounter = 1000;
  constructor(private readonly db: InventoryDb) {}

  async save(order: SalesOrder): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx.select().from(salesOrders).where(eq(salesOrders.id, order.getId().getValue())).limit(1);
      if (existing.length > 0) {
        await tx.update(salesOrders)
          .set({
            orderNumber: order.getOrderNumber(),
            customerId: order.getCustomer().getCustomerId(),
            customerGroupId: order.getCustomer().getCustomerGroupId(),
            status: order.getStatus().getKind(),
            currencyCode: order.getCurrencyCode(),
            notes: order.getNotes(),
            version: order.getVersion(),
            updatedAt: order.getUpdatedAt(),
            confirmedAt: order.getConfirmedAt(),
            fulfilledAt: order.getFulfilledAt(),
            cancelledAt: order.getCancelledAt(),
          })
          .where(eq(salesOrders.id, order.getId().getValue()));
      } else {
        await tx.insert(salesOrders).values({
          id: order.getId().getValue(),
          orderNumber: order.getOrderNumber(),
          customerId: order.getCustomer().getCustomerId(),
          customerGroupId: order.getCustomer().getCustomerGroupId(),
          status: order.getStatus().getKind(),
          currencyCode: order.getCurrencyCode(),
          notes: order.getNotes(),
          version: order.getVersion(),
          createdAt: order.getCreatedAt(),
          updatedAt: order.getUpdatedAt(),
          confirmedAt: order.getConfirmedAt(),
          fulfilledAt: order.getFulfilledAt(),
          cancelledAt: order.getCancelledAt(),
        });
      }
      await tx.delete(orderLines).where(eq(orderLines.salesOrderId, order.getId().getValue()));
      for (const l of order.getLines()) {
        await tx.insert(orderLines).values({
          id: l.getId(),
          salesOrderId: order.getId().getValue(),
          productId: l.getProductId(),
          productName: l.getProductName(),
          productSku: l.getProductSku(),
          quantity: l.getQuantity(),
          uom: l.getUom(),
          unitPrice: l.getUnitPrice().getAmount().toString(),
          currencyCode: l.getUnitPrice().getCurrency().getCode(),
          discountPercent: l.getDiscountPercent().toString(),
          taxPercent: l.getTaxPercent().toString(),
          notes: l.getNotes(),
          createdAt: l.getCreatedAt(),
        });
      }
    });
  }

  async findById(id: SalesOrderId): Promise<SalesOrder | null> {
    const rows = await this.db.select().from(salesOrders).where(eq(salesOrders.id, id.getValue())).limit(1);
    if (rows.length === 0) return null;
    return this.rehydrate(rows[0]!);
  }

  async findByOrderNumber(orderNumber: string): Promise<SalesOrder | null> {
    const rows = await this.db.select().from(salesOrders).where(eq(salesOrders.orderNumber, orderNumber)).limit(1);
    if (rows.length === 0) return null;
    return this.rehydrate(rows[0]!);
  }

  async search(criteria: SalesOrderSearchCriteria): Promise<ReadonlyArray<SalesOrder>> {
    const conds = [];
    if (criteria.customerId) conds.push(eq(salesOrders.customerId, criteria.customerId));
    if (criteria.status) conds.push(eq(salesOrders.status, criteria.status));
    if (criteria.from) conds.push(gte(salesOrders.createdAt, criteria.from));
    if (criteria.to) conds.push(lte(salesOrders.createdAt, criteria.to));
    const rows = await this.db
      .select()
      .from(salesOrders)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(salesOrders.createdAt))
      .limit(criteria.limit ?? 100)
      .offset(criteria.offset ?? 0);
    const out: SalesOrder[] = [];
    for (const r of rows) {
      const agg = await this.rehydrate(r);
      if (agg) out.push(agg);
    }
    return out;
  }

  async nextOrderNumber(): Promise<string> {
    this.orderCounter += 1;
    return `SO-${this.orderCounter}-${Date.now() % 10000}`;
  }

  private async rehydrate(row: typeof salesOrders.$inferSelect): Promise<SalesOrder | null> {
    const lines = await this.db.select().from(orderLines).where(eq(orderLines.salesOrderId, row.id));
    const domainLines = lines.map((l) =>
      OrderLine.create({
        id: l.id,
        salesOrderId: l.salesOrderId,
        productId: l.productId,
        productName: l.productName,
        productSku: l.productSku,
        quantity: l.quantity,
        uom: l.uom,
        unitPrice: Money.of(Number(l.unitPrice), l.currencyCode),
        discountPercent: Number(l.discountPercent),
        taxPercent: Number(l.taxPercent),
        notes: l.notes,
        createdAt: l.createdAt,
      }),
    );
    const props: SalesOrderProps = {
      id: SalesOrderId.of(row.id),
      orderNumber: row.orderNumber,
      customer: CustomerRef.of(row.customerId, row.customerGroupId),
      status: OrderStatus.fromKind(row.status as 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'INVOICED' | 'CLOSED' | 'CANCELLED'),
      currencyCode: row.currencyCode,
      lines: domainLines,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      confirmedAt: row.confirmedAt,
      fulfilledAt: row.fulfilledAt,
      cancelledAt: row.cancelledAt,
      version: row.version,
    };
    return SalesOrder.rehydrate(props);
  }
}
