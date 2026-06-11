/**
 * Drizzle InvoiceRepository
 */
import { and, eq, gte, lte, desc, lt, isNotNull } from 'drizzle-orm';
import type { InventoryDb } from '../db';
import { invoices, invoiceLines, invoicePayments } from '../schemas/inv.sales-order.schema';
import { Invoice, type PaymentEntry, type InvoiceProps } from '@oserp-community/inventory/domain/aggregates/Invoice';
import { InvoiceLine } from '@oserp-community/inventory/domain/entities/InvoiceLine';
import { InvoiceId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { InvoiceStatus } from '@oserp-community/inventory/domain/value-objects/SalesStatus';
import type {
  InvoiceRepository,
  InvoiceSearchCriteria,
} from '@oserp-community/inventory/application/ports/InvoiceRepositoryPort';

export class DrizzleInvoiceRepository implements InvoiceRepository {
  private invoiceCounter = 5000;
  constructor(private readonly db: InventoryDb) {}

  async save(invoice: Invoice, payments: ReadonlyArray<PaymentEntry>): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx.select().from(invoices).where(eq(invoices.id, invoice.getId().getValue())).limit(1);
      if (existing.length > 0) {
        await tx.update(invoices)
          .set({
            invoiceNumber: invoice.getInvoiceNumber(),
            salesOrderId: invoice.getSalesOrderId(),
            customerId: invoice.getCustomerId(),
            status: invoice.getStatus().getKind(),
            currencyCode: invoice.getCurrencyCode(),
            paidAmount: invoice.getPaidAmount().getAmount().toString(),
            notes: invoice.getNotes(),
            version: invoice.getVersion(),
            updatedAt: invoice.getUpdatedAt(),
            issuedAt: invoice.getIssuedAt(),
            paidAt: invoice.getPaidAt(),
            voidedAt: invoice.getVoidedAt(),
            dueDate: invoice.getDueDate(),
          })
          .where(eq(invoices.id, invoice.getId().getValue()));
      } else {
        await tx.insert(invoices).values({
          id: invoice.getId().getValue(),
          invoiceNumber: invoice.getInvoiceNumber(),
          salesOrderId: invoice.getSalesOrderId(),
          customerId: invoice.getCustomerId(),
          status: invoice.getStatus().getKind(),
          currencyCode: invoice.getCurrencyCode(),
          paidAmount: invoice.getPaidAmount().getAmount().toString(),
          notes: invoice.getNotes(),
          version: invoice.getVersion(),
          createdAt: invoice.getCreatedAt(),
          updatedAt: invoice.getUpdatedAt(),
          issuedAt: invoice.getIssuedAt(),
          paidAt: invoice.getPaidAt(),
          voidedAt: invoice.getVoidedAt(),
          dueDate: invoice.getDueDate(),
        });
      }
      // Lines: replace
      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.getId().getValue()));
      for (const l of invoice.getLines()) {
        await tx.insert(invoiceLines).values({
          id: l.getId(),
          invoiceId: invoice.getId().getValue(),
          orderLineId: l.getOrderLineId(),
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
      // Payments: replace
      await tx.delete(invoicePayments).where(eq(invoicePayments.invoiceId, invoice.getId().getValue()));
      for (const p of payments) {
        await tx.insert(invoicePayments).values({
          id: p.id,
          invoiceId: invoice.getId().getValue(),
          amount: p.amount.getAmount().toString(),
          currencyCode: p.amount.getCurrency().getCode(),
          method: p.method,
          reference: p.reference,
          paidAt: p.paidAt,
        });
      }
    });
  }

  async findById(id: InvoiceId) {
    const row = (await this.db.select().from(invoices).where(eq(invoices.id, id.getValue())).limit(1))[0];
    if (!row) return null;
    return this.rehydrate(row);
  }

  async findByInvoiceNumber(invoiceNumber: string) {
    const row = (await this.db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber)).limit(1))[0];
    if (!row) return null;
    return this.rehydrate(row);
  }

  async search(criteria: InvoiceSearchCriteria): Promise<ReadonlyArray<Invoice>> {
    const conds = [];
    if (criteria.customerId) conds.push(eq(invoices.customerId, criteria.customerId));
    if (criteria.salesOrderId) conds.push(eq(invoices.salesOrderId, criteria.salesOrderId));
    if (criteria.status) conds.push(eq(invoices.status, criteria.status));
    if (criteria.from) conds.push(gte(invoices.createdAt, criteria.from));
    if (criteria.to) conds.push(lte(invoices.createdAt, criteria.to));
    if (criteria.overdueOnly && criteria.to) {
      conds.push(isNotNull(invoices.dueDate));
      conds.push(lt(invoices.dueDate, criteria.to));
    }
    const rows = await this.db
      .select()
      .from(invoices)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(invoices.createdAt))
      .limit(criteria.limit ?? 100)
      .offset(criteria.offset ?? 0);
    const out: Invoice[] = [];
    for (const r of rows) {
      const re = await this.rehydrate(r);
      if (re) out.push(re.invoice);
    }
    return out;
  }

  async nextInvoiceNumber(): Promise<string> {
    this.invoiceCounter += 1;
    return `INV-${this.invoiceCounter}-${Date.now() % 10000}`;
  }

  private async rehydrate(row: typeof invoices.$inferSelect): Promise<{ invoice: Invoice; payments: ReadonlyArray<PaymentEntry> } | null> {
    const lines = await this.db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, row.id));
    const pays = await this.db.select().from(invoicePayments).where(eq(invoicePayments.invoiceId, row.id));
    const domainLines = lines.map((l) =>
      InvoiceLine.create({
        id: l.id,
        invoiceId: l.invoiceId,
        orderLineId: l.orderLineId,
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
    const payments: PaymentEntry[] = pays.map((p) => ({
      id: p.id,
      amount: Money.of(Number(p.amount), p.currencyCode),
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt,
    }));
    const props: InvoiceProps = {
      id: InvoiceId.of(row.id),
      invoiceNumber: row.invoiceNumber,
      salesOrderId: row.salesOrderId,
      status: InvoiceStatus.fromKind(row.status as 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CLOSED' | 'VOID'),
      currencyCode: row.currencyCode,
      lines: domainLines,
      paidAmount: Money.of(Number(row.paidAmount), row.currencyCode),
      customerId: row.customerId,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      issuedAt: row.issuedAt,
      paidAt: row.paidAt,
      voidedAt: row.voidedAt,
      dueDate: row.dueDate,
      version: row.version,
    };
    return { invoice: Invoice.rehydrate(props, payments), payments };
  }
}
