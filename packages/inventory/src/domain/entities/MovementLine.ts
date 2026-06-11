import { ProductId } from '../value-objects/ProductId';
import { LotRef } from '../value-objects/LotRef';
import { LocationRef } from '../value-objects/LocationRef';
import { ValidationError } from '../errors/ValidationError';

/**
 * MovementLine — StockMovement aggregate'inin iç entity'si.
 * Bir hareket birden fazla satırdan oluşabilir (örn: bir alım birden fazla ürün).
 */
export class MovementLine {
  private constructor(
    private readonly productId: ProductId,
    private readonly quantity: string,
    private readonly uom: string,
    private readonly lotRef: LotRef | null,
    private readonly fromLocation: LocationRef | null,
    private readonly toLocation: LocationRef | null,
    private readonly unitCost: string | null,
  ) {}

  static create(params: {
    productId: ProductId;
    quantity: string;
    uom: string;
    lotRef?: LotRef | null;
    fromLocation?: LocationRef | null;
    toLocation?: LocationRef | null;
    unitCost?: string | null;
  }): MovementLine {
    // Quantity may be signed for ADJUSTMENT lines ("+5", "-3"); service interprets.
    if (!/^[+-]?\d+(\.\d+)?$/.test(params.quantity)) {
      throw new ValidationError(`quantity must be signed decimal: ${params.quantity}`);
    }
    if (params.uom.length > 16) {
      throw new ValidationError(`uom max 16: ${params.uom}`);
    }
    if (params.unitCost !== null && params.unitCost !== undefined) {
      if (!/^\d+(\.\d+)?$/.test(params.unitCost)) {
        throw new ValidationError(`unitCost must be non-negative decimal: ${params.unitCost}`);
      }
    }
    return new MovementLine(
      params.productId,
      params.quantity,
      params.uom.toUpperCase(),
      params.lotRef ?? null,
      params.fromLocation ?? null,
      params.toLocation ?? null,
      params.unitCost ?? null,
    );
  }

  getProductId(): ProductId { return this.productId; }
  getQuantity(): string { return this.quantity; }
  getUom(): string { return this.uom; }
  getLotRef(): LotRef | null { return this.lotRef; }
  getFromLocation(): LocationRef | null { return this.fromLocation; }
  getToLocation(): LocationRef | null { return this.toLocation; }
  getUnitCost(): string | null { return this.unitCost; }
}
