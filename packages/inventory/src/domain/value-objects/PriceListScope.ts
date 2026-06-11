/**
 * PriceListScope Value Object
 *
 * Identifies the "audience" of a price list:
 *   - GLOBAL: applies to everyone (base / fallback list)
 *   - CUSTOMER: applies to a specific customer (customer override)
 *   - CUSTOMER_GROUP: applies to a customer segment (e.g. "VIP", "Retail")
 *
 * Scope carries an optional targetId (customer or group id). GLOBAL must have
 * null targetId; CUSTOMER and CUSTOMER_GROUP must have a non-empty targetId.
 *
 * Examples:
 *   PriceListScope.global()
 *   PriceListScope.customer("cust_123")
 *   PriceListScope.customerGroup("vip_segment")
 */
export type PriceListScopeKind = 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP';

export class PriceListScope {
  private constructor(
    private readonly kind: PriceListScopeKind,
    private readonly targetId: string | null,
  ) {
    Object.freeze(this);
  }

  static global(): PriceListScope {
    return new PriceListScope('GLOBAL', null);
  }

  static customer(customerId: string): PriceListScope {
    if (!customerId || customerId.trim() === '') {
      throw new Error('Customer scope requires non-empty customerId');
    }
    return new PriceListScope('CUSTOMER', customerId);
  }

  static customerGroup(groupId: string): PriceListScope {
    if (!groupId || groupId.trim() === '') {
      throw new Error('Customer group scope requires non-empty groupId');
    }
    return new PriceListScope('CUSTOMER_GROUP', groupId);
  }

  static fromPersistence(kind: PriceListScopeKind, targetId: string | null): PriceListScope {
    if (kind === 'GLOBAL') return PriceListScope.global();
    if (kind === 'CUSTOMER' && targetId) return PriceListScope.customer(targetId);
    if (kind === 'CUSTOMER_GROUP' && targetId) return PriceListScope.customerGroup(targetId);
    throw new Error(`Invalid persisted scope: kind=${kind} targetId=${targetId}`);
  }

  getKind(): PriceListScopeKind {
    return this.kind;
  }

  getTargetId(): string | null {
    return this.targetId;
  }

  /**
   * Higher precedence wins:
   *   CUSTOMER > CUSTOMER_GROUP > GLOBAL
   */
  isHigherPrecedenceThan(other: PriceListScope): boolean {
    const order: Record<PriceListScopeKind, number> = {
      GLOBAL: 0,
      CUSTOMER_GROUP: 1,
      CUSTOMER: 2,
    };
    return order[this.kind] > order[other.kind];
  }

  matchesScope(other: PriceListScope): boolean {
    if (this.kind === 'GLOBAL' && other.kind === 'GLOBAL') return true;
    if (this.kind === 'CUSTOMER' && other.kind === 'CUSTOMER') {
      return this.targetId === other.targetId;
    }
    if (this.kind === 'CUSTOMER_GROUP' && other.kind === 'CUSTOMER_GROUP') {
      return this.targetId === other.targetId;
    }
    return false;
  }

  equals(other: PriceListScope): boolean {
    if (!(other instanceof PriceListScope)) return false;
    return this.kind === other.kind && this.targetId === other.targetId;
  }

  toString(): string {
    if (this.kind === 'GLOBAL') return 'GLOBAL';
    return `${this.kind}:${this.targetId}`;
  }

  toJSON(): { kind: PriceListScopeKind; targetId: string | null } {
    return { kind: this.kind, targetId: this.targetId };
  }
}
