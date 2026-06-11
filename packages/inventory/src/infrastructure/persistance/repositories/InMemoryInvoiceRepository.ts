/**
 * In-memory InvoiceRepository. Tests / dev.
 */
import type { Invoice, PaymentEntry } from '@oserp-community/inventory/domain/aggregates/Invoice';
import type { InvoiceId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import type {
  InvoiceRepository,
  InvoiceSearchCriteria,
} from '@oserp-community/inventory/application/ports/InvoiceRepositoryPort';

export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly byId = new Map<string, { invoice: Invoice; payments: ReadonlyArray<PaymentEntry> }>();
  private invoiceCounter = 5000;

  async save(invoice: Invoice, payments: ReadonlyArray<PaymentEntry>): Promise<void> {
    this.byId.set(invoice.getId().getValue(), { invoice, payments });
  }
  async findById(id: InvoiceId) {
    return this.byId.get(id.getValue()) ?? null;
  }
  async findByInvoiceNumber(invoiceNumber: string) {
    for (const v of this.byId.values()) {
      if (v.invoice.getInvoiceNumber() === invoiceNumber) return v;
    }
    return null;
  }
  async search(criteria: InvoiceSearchCriteria): Promise<ReadonlyArray<Invoice>> {
    let arr = Array.from(this.byId.values()).map((v) => v.invoice);
    if (criteria.customerId) {
      arr = arr.filter((i) => i.getCustomerId() === criteria.customerId);
    }
    if (criteria.salesOrderId) {
      arr = arr.filter((i) => i.getSalesOrderId() === criteria.salesOrderId);
    }
    if (criteria.status) {
      arr = arr.filter((i) => i.getStatus().getKind() === criteria.status);
    }
    if (criteria.from) {
      arr = arr.filter((i) => i.getCreatedAt() >= criteria.from!);
    }
    if (criteria.to) {
      arr = arr.filter((i) => i.getCreatedAt() <= criteria.to!);
    }
    if (criteria.overdueOnly && criteria.to) {
      arr = arr.filter(
        (i) =>
          i.getDueDate() !== null &&
          i.getDueDate()! < criteria.to! &&
          !i.isFullyPaid() &&
          i.getStatus().getKind() !== 'VOID',
      );
    }
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? arr.length;
    return arr.slice(offset, offset + limit);
  }
  async nextInvoiceNumber(): Promise<string> {
    this.invoiceCounter += 1;
    return `INV-${this.invoiceCounter}`;
  }
}
