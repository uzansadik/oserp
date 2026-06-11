/**
 * Invoice Aggregate
 *
 * Created from a confirmed/fulfilled SalesOrder. Holds invoice lines (also
 * immutable snapshots) and tracks payment state.
 *
 * State machine:
 *   DRAFT → ISSUED → PARTIALLY_PAID* → PAID → CLOSED
 *                       ↘ VOID
 *
 * Payment tracking:
 *   - getTotal(): sum of line totals
 *   - getPaidAmount(): sum of recorded payments
 *   - recordPayment(amount): adds a payment, transitions status as needed
 *   - isFullyPaid(): paidAmount >= total
 */
import { AggregateRoot } from '../entities/AggregateRoot';
import { InvoiceLine, type InvoiceLineProps } from '../entities/InvoiceLine';
import { InvoiceId } from '../value-objects/SalesOrderId';
import { Money } from '../value-objects/Money';
import { InvoiceStatus } from '../value-objects/SalesStatus';
import {
  InvoiceCreatedEvent,
  InvoiceIssuedEvent,
  InvoicePaidEvent,
  InvoiceVoidedEvent,
  PaymentRecordedEvent,
} from '../events/SalesOrderEvents';

export interface InvoiceProps {
  id: InvoiceId;
  invoiceNumber: string;
  salesOrderId: string;
  status: InvoiceStatus;
  currencyCode: string;
  lines: ReadonlyArray<InvoiceLine>;
  paidAmount: Money;
  customerId: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  dueDate: Date | null;
  version: number;
}

export interface PaymentEntry {
  id: string;
  amount: Money;
  paidAt: Date;
  method: string; // 'CASH' | 'CARD' | 'BANK_TRANSFER' | etc
  reference: string | null;
}

export class Invoice extends AggregateRoot {
  private constructor(
    private readonly props: InvoiceProps,
    private readonly payments: ReadonlyArray<PaymentEntry>,
  ) {
    super();
    Object.freeze(this.props.lines);
    Object.freeze(this.payments);
  }

  static create(opts: {
    id: string;
    invoiceNumber: string;
    salesOrderId: string;
    customerId: string;
    currencyCode: string;
    lines: ReadonlyArray<InvoiceLine>;
    dueDate?: Date | null;
    notes?: string | null;
  }): Invoice {
    if (opts.lines.length === 0) {
      throw new Error('Cannot create invoice without lines');
    }
    const now = new Date();
    const inv = new Invoice(
      {
        id: InvoiceId.of(opts.id),
        invoiceNumber: opts.invoiceNumber,
        salesOrderId: opts.salesOrderId,
        status: InvoiceStatus.draft(),
        currencyCode: opts.currencyCode,
        lines: opts.lines,
        paidAmount: Money.zero(opts.currencyCode),
        customerId: opts.customerId,
        notes: opts.notes ?? null,
        createdAt: now,
        updatedAt: now,
        issuedAt: null,
        paidAt: null,
        voidedAt: null,
        dueDate: opts.dueDate ?? null,
        version: 1,
      },
      [],
    );
    inv.addDomainEvent(
      new InvoiceCreatedEvent({
        invoiceId: opts.id,
        invoiceNumber: opts.invoiceNumber,
        salesOrderId: opts.salesOrderId,
        customerId: opts.customerId,
        total: inv.getTotal().getAmount(),
        currencyCode: opts.currencyCode,
        occurredAt: now,
      }),
    );
    return inv;
  }

  static rehydrate(props: InvoiceProps, payments: ReadonlyArray<PaymentEntry>): Invoice {
    return new Invoice(props, payments);
  }

  getId(): InvoiceId {
    return this.props.id;
  }
  getInvoiceNumber(): string {
    return this.props.invoiceNumber;
  }
  getSalesOrderId(): string {
    return this.props.salesOrderId;
  }
  getStatus(): InvoiceStatus {
    return this.props.status;
  }
  getCurrencyCode(): string {
    return this.props.currencyCode;
  }
  getLines(): ReadonlyArray<InvoiceLine> {
    return this.props.lines;
  }
  getCustomerId(): string {
    return this.props.customerId;
  }
  getNotes(): string | null {
    return this.props.notes;
  }
  getCreatedAt(): Date {
    return this.props.createdAt;
  }
  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }
  getIssuedAt(): Date | null {
    return this.props.issuedAt;
  }
  getPaidAt(): Date | null {
    return this.props.paidAt;
  }
  getVoidedAt(): Date | null {
    return this.props.voidedAt;
  }
  getDueDate(): Date | null {
    return this.props.dueDate;
  }
  getVersion(): number {
    return this.props.version;
  }
  getPayments(): ReadonlyArray<PaymentEntry> {
    return this.payments;
  }
  getPaidAmount(): Money {
    return this.props.paidAmount;
  }
  getOutstandingAmount(): Money {
    return this.getTotal().subtract(this.getPaidAmount());
  }
  isFullyPaid(): boolean {
    return this.getOutstandingAmount().isZero() || this.getOutstandingAmount().isNegative();
  }

  // --- Behavior ---

  issue(): void {
    if (this.props.status.getKind() !== 'DRAFT') {
      throw new Error(`Cannot issue invoice in status ${this.props.status}`);
    }
    const now = new Date();
    this.props.status = InvoiceStatus.issued();
    this.props.issuedAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new InvoiceIssuedEvent({
        invoiceId: this.props.id.getValue(),
        invoiceNumber: this.props.invoiceNumber,
        occurredAt: now,
      }),
    );
  }

  recordPayment(opts: { id: string; amount: Money; method: string; reference?: string | null }): void {
    if (this.props.status.getKind() !== 'ISSUED' && this.props.status.getKind() !== 'PARTIALLY_PAID') {
      throw new Error(`Cannot record payment in status ${this.props.status}`);
    }
    if (!opts.amount.getCurrency().equals(this.getTotal().getCurrency())) {
      throw new Error(`Payment currency ${opts.amount.getCurrency()} != invoice ${this.getTotal().getCurrency()}`);
    }
    const newTotal = this.props.paidAmount.add(opts.amount);
    const now = new Date();
    const entry: PaymentEntry = {
      id: opts.id,
      amount: opts.amount,
      paidAt: now,
      method: opts.method,
      reference: opts.reference ?? null,
    };
    // Mutate payments via a "next" pattern is hard with private readonly;
    // for simplicity we directly mutate this.payments array (it's frozen
    // but append is fine on a frozen array? no, push fails on frozen).
    // Workaround: cast and use concat-like replacement.
    (this as unknown as { payments: PaymentEntry[] }).payments = [...this.payments, entry];
    this.props.paidAmount = newTotal;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new PaymentRecordedEvent({
        invoiceId: this.props.id.getValue(),
        paymentId: opts.id,
        amount: opts.amount.getAmount(),
        currencyCode: opts.amount.getCurrency().getCode(),
        method: opts.method,
        paidAt: now,
      }),
    );
    // Auto-transition
    if (this.isFullyPaid()) {
      this.props.status = InvoiceStatus.paid();
      this.props.paidAt = now;
      this.addDomainEvent(
        new InvoicePaidEvent({
          invoiceId: this.props.id.getValue(),
          invoiceNumber: this.props.invoiceNumber,
          totalPaid: newTotal.getAmount(),
          occurredAt: now,
        }),
      );
    } else {
      this.props.status = InvoiceStatus.partiallyPaid();
    }
  }

  voidInvoice(reason: string | null = null): void {
    if (!this.props.status.canTransitionTo(InvoiceStatus.void())) {
      throw new Error(`Cannot void invoice in status ${this.props.status}`);
    }
    const now = new Date();
    this.props.status = InvoiceStatus.void();
    this.props.voidedAt = now;
    this.props.updatedAt = now;
    this.props.version += 1;
    this.addDomainEvent(
      new InvoiceVoidedEvent({
        invoiceId: this.props.id.getValue(),
        invoiceNumber: this.props.invoiceNumber,
        reason,
        occurredAt: now,
      }),
    );
  }

  close(): void {
    if (this.props.status.getKind() !== 'PAID') {
      throw new Error(`Cannot close invoice in status ${this.props.status}`);
    }
    this.props.status = InvoiceStatus.closed();
    this.props.updatedAt = new Date();
    this.props.version += 1;
  }

  // --- Totals ---

  getSubtotal(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines.map((l) => l.getSubtotal()).reduce((a, m) => a.add(m));
  }

  getTotalDiscount(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines.map((l) => l.getDiscountAmount()).reduce((a, m) => a.add(m));
  }

  getTotalTax(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines.map((l) => l.getTaxAmount()).reduce((a, m) => a.add(m));
  }

  getTotal(): Money {
    if (this.props.lines.length === 0) return Money.zero(this.props.currencyCode);
    return this.props.lines.map((l) => l.getLineTotal()).reduce((a, m) => a.add(m));
  }

  static makeLineProps(opts: Omit<InvoiceLineProps, 'createdAt'> & { createdAt?: Date }): InvoiceLineProps {
    return {
      ...opts,
      createdAt: opts.createdAt ?? new Date(),
    };
  }
}
