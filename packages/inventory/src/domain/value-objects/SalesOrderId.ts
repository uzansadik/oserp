/**
 * SalesOrderId Value Object
 */
const ID_REGEX = /^[A-Za-z0-9._:-]{1,64}$/;

export class SalesOrderId {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }
  static of(value: string): SalesOrderId {
    if (!value || !ID_REGEX.test(value)) throw new Error(`Invalid SalesOrderId: ${value}`);
    return new SalesOrderId(value);
  }
  getValue(): string {
    return this.value;
  }
  equals(other: SalesOrderId): boolean {
    return other instanceof SalesOrderId && this.value === other.value;
  }
  toString(): string {
    return this.value;
  }
  toJSON(): string {
    return this.value;
  }
}

/**
 * InvoiceId Value Object
 */
export class InvoiceId {
  private constructor(private readonly value: string) {
    Object.freeze(this);
  }
  static of(value: string): InvoiceId {
    if (!value || !ID_REGEX.test(value)) throw new Error(`Invalid InvoiceId: ${value}`);
    return new InvoiceId(value);
  }
  getValue(): string {
    return this.value;
  }
  equals(other: InvoiceId): boolean {
    return other instanceof InvoiceId && this.value === other.value;
  }
  toString(): string {
    return this.value;
  }
  toJSON(): string {
    return this.value;
  }
}

/**
 * CustomerRef — light reference to a customer (no aggregate loaded)
 */
export class CustomerRef {
  private constructor(
    private readonly customerId: string,
    private readonly customerGroupId: string | null,
  ) {
    Object.freeze(this);
  }
  static of(customerId: string, customerGroupId: string | null = null): CustomerRef {
    if (!customerId) throw new Error('CustomerRef requires customerId');
    return new CustomerRef(customerId, customerGroupId);
  }
  getCustomerId(): string {
    return this.customerId;
  }
  getCustomerGroupId(): string | null {
    return this.customerGroupId;
  }
  equals(other: CustomerRef): boolean {
    return (
      other instanceof CustomerRef &&
      this.customerId === other.customerId &&
      this.customerGroupId === other.customerGroupId
    );
  }
  toJSON(): { customerId: string; customerGroupId: string | null } {
    return { customerId: this.customerId, customerGroupId: this.customerGroupId };
  }
}
