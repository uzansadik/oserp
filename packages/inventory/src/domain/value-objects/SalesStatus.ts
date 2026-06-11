/**
 * OrderStatus + OrderStatusMachine
 *
 * Lifecycle: DRAFT → CONFIRMED → FULFILLED → INVOICED → CLOSED
 *                                                     ↑ (auto)
 * Any state → CANCELLED (manual, only if not yet INVOICED)
 */
export type OrderStatusKind =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'FULFILLED'
  | 'INVOICED'
  | 'CLOSED'
  | 'CANCELLED';

export class OrderStatus {
  private constructor(private readonly kind: OrderStatusKind) {
    Object.freeze(this);
  }
  static draft(): OrderStatus {
    return new OrderStatus('DRAFT');
  }
  static confirmed(): OrderStatus {
    return new OrderStatus('CONFIRMED');
  }
  static fulfilled(): OrderStatus {
    return new OrderStatus('FULFILLED');
  }
  static invoiced(): OrderStatus {
    return new OrderStatus('INVOICED');
  }
  static closed(): OrderStatus {
    return new OrderStatus('CLOSED');
  }
  static cancelled(): OrderStatus {
    return new OrderStatus('CANCELLED');
  }
  static fromKind(k: OrderStatusKind): OrderStatus {
    switch (k) {
      case 'DRAFT':
        return OrderStatus.draft();
      case 'CONFIRMED':
        return OrderStatus.confirmed();
      case 'FULFILLED':
        return OrderStatus.fulfilled();
      case 'INVOICED':
        return OrderStatus.invoiced();
      case 'CLOSED':
        return OrderStatus.closed();
      case 'CANCELLED':
        return OrderStatus.cancelled();
      default:
        throw new Error(`Unknown OrderStatus: ${k as string}`);
    }
  }
  getKind(): OrderStatusKind {
    return this.kind;
  }
  isTerminal(): boolean {
    return this.kind === 'CLOSED' || this.kind === 'CANCELLED';
  }
  canTransitionTo(next: OrderStatus): boolean {
    const t = this.kind;
    const n = next.kind;
    if (t === n) return true; // idempotent
    // Cancellation: any non-INVOICED, non-CLOSED, non-CANCELLED state
    if (n === 'CANCELLED') {
      return t === 'DRAFT' || t === 'CONFIRMED' || t === 'FULFILLED';
    }
    if (t === 'DRAFT' && n === 'CONFIRMED') return true;
    if (t === 'CONFIRMED' && (n === 'FULFILLED' || n === 'INVOICED')) return true;
    if (t === 'FULFILLED' && n === 'INVOICED') return true;
    if (t === 'INVOICED' && n === 'CLOSED') return true;
    return false;
  }
  equals(other: OrderStatus): boolean {
    return other instanceof OrderStatus && this.kind === other.kind;
  }
  toString(): string {
    return this.kind;
  }
}

/**
 * InvoiceStatus + InvoiceStatusMachine
 *
 * Lifecycle: DRAFT → ISSUED → (PARTIALLY_PAID)* → PAID → CLOSED
 *                          ↘ VOID (cancel an issued invoice)
 */
export type InvoiceStatusKind = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CLOSED' | 'VOID';

export class InvoiceStatus {
  private constructor(private readonly kind: InvoiceStatusKind) {
    Object.freeze(this);
  }
  static draft(): InvoiceStatus {
    return new InvoiceStatus('DRAFT');
  }
  static issued(): InvoiceStatus {
    return new InvoiceStatus('ISSUED');
  }
  static partiallyPaid(): InvoiceStatus {
    return new InvoiceStatus('PARTIALLY_PAID');
  }
  static paid(): InvoiceStatus {
    return new InvoiceStatus('PAID');
  }
  static closed(): InvoiceStatus {
    return new InvoiceStatus('CLOSED');
  }
  static void(): InvoiceStatus {
    return new InvoiceStatus('VOID');
  }
  static fromKind(k: InvoiceStatusKind): InvoiceStatus {
    switch (k) {
      case 'DRAFT':
        return InvoiceStatus.draft();
      case 'ISSUED':
        return InvoiceStatus.issued();
      case 'PARTIALLY_PAID':
        return InvoiceStatus.partiallyPaid();
      case 'PAID':
        return InvoiceStatus.paid();
      case 'CLOSED':
        return InvoiceStatus.closed();
      case 'VOID':
        return InvoiceStatus.void();
      default:
        throw new Error(`Unknown InvoiceStatus: ${k as string}`);
    }
  }
  getKind(): InvoiceStatusKind {
    return this.kind;
  }
  isTerminal(): boolean {
    return this.kind === 'CLOSED' || this.kind === 'VOID';
  }
  canTransitionTo(next: InvoiceStatus): boolean {
    const t = this.kind;
    const n = next.kind;
    if (t === n) return true;
    if (n === 'VOID') {
      return t === 'DRAFT' || t === 'ISSUED' || t === 'PARTIALLY_PAID';
    }
    if (t === 'DRAFT' && n === 'ISSUED') return true;
    if (t === 'ISSUED' && (n === 'PARTIALLY_PAID' || n === 'PAID')) return true;
    if (t === 'PARTIALLY_PAID' && (n === 'PARTIALLY_PAID' || n === 'PAID')) return true;
    if (t === 'PAID' && n === 'CLOSED') return true;
    return false;
  }
  equals(other: InvoiceStatus): boolean {
    return other instanceof InvoiceStatus && this.kind === other.kind;
  }
  toString(): string {
    return this.kind;
  }
}
