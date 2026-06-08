import { SKU } from '../value-objects/SKU';

export class Product {
  constructor(
    public readonly id: string,
    public readonly sku: SKU,
    public readonly name: string,
    public readonly createdAt: Date,
  ) {}

  static create(id: string, sku: string, name: string): Product {
    return new Product(id, SKU.create(sku), name, new Date());
  }

  equals(other: Product): boolean {
    return (
      other instanceof Product &&
      this.id === other.id &&
      this.sku.equals(other.sku) &&
      this.name === other.name &&
      this.createdAt.getTime() === other.createdAt.getTime()
    );
  }

  public toJSON() {
    return {
      id: this.id,
      sku: this.sku.getValue(),
      name: this.name,
      createdAt: this.createdAt.toISOString(),
    };
  }

  public setName(newName: string): Product {
    return new Product(this.id, this.sku, newName, this.createdAt);
  }

  public setSKU(newSKU: string): Product {
    return new Product(this.id, SKU.create(newSKU), this.name, this.createdAt);
  }
}
