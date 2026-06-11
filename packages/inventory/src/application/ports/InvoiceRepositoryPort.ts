/**
 * Port: InvoiceRepository
 */
import { Invoice, type PaymentEntry } from '../../domain/aggregates/Invoice';
import { InvoiceId } from '../../domain/value-objects/SalesOrderId';

export interface InvoiceSearchCriteria {
  customerId?: string;
  salesOrderId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  overdueOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface InvoiceRepository {
  save(invoice: Invoice, payments: ReadonlyArray<PaymentEntry>): Promise<void>;
  findById(id: InvoiceId): Promise<{ invoice: Invoice; payments: ReadonlyArray<PaymentEntry> } | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<{ invoice: Invoice; payments: ReadonlyArray<PaymentEntry> } | null>;
  search(criteria: InvoiceSearchCriteria): Promise<ReadonlyArray<Invoice>>;
  nextInvoiceNumber(): Promise<string>;
}
