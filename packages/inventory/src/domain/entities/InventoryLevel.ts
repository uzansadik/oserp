import { AggregateRoot } from './AggregateRoot';
import { ProductId } from '../value-objects/ProductId';
import { LocationRef } from '../value-objects/LocationRef';
import { LotRef } from '../value-objects/LotRef';
import { Quantity } from '../value-objects/Quantity';
import { ValuationSnapshot } from '../value-objects/ValuationSnapshot';
import { ReorderStatusVO } from '../value-objects/ReorderStatus';
import { StockLevelChangedEvent } from '../events/StockLevelChangedEvent';

export type ReconstituteInventoryLevelProps = {
  productId: ProductId;
  location: LocationRef;
  lotRef: LotRef | null;
  quantity: Quantity;
  valuation: ValuationSnapshot;
  reorderStatus: ReorderStatusVO;
  version: number;
  updatedAt: Date;
  createdAt: Date;
};

/**
 * InventoryLevel — Anlık stok seviyesi aggregate.
 *
 * Identity composite: (productId, locationId, lotId?).
 * Concurrency: optimistic lock (`version`).
 *
 * Davranış:
 *  - `applyReceipt(qty)`     → onHand += qty
 *  - `applyIssue(qty)`       → onHand -= qty (yetersizse InvalidStateError)
 *  - `applyTransferOut(qty)` → onHand -= qty; inTransit += qty
 *  - `applyTransferIn(qty)`  → inTransit -= qty; onHand += qty
 *  - `applyAdjustment(±qty, sign)` → onHand += veya -=
 *  - `applyScrap(qty)`       → onHand -= qty
 *
 * Her mutasyon domain event üretmez; InventoryLevel session-internal'dır.
 * StockProjectionService Stock* event'lerini dinleyip level'i günceller.
 */
export class InventoryLevel extends AggregateRoot {
  private readonly productId: ProductId;
  private readonly location: LocationRef;
  private readonly lotRef: LotRef | null;
  private quantity: Quantity;
  private valuation: ValuationSnapshot;
  private reorderStatus: ReorderStatusVO;
  private version: number;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: ReconstituteInventoryLevelProps) {
    super();
    this.productId = props.productId;
    this.location = props.location;
    this.lotRef = props.lotRef;
    this.quantity = props.quantity;
    this.valuation = props.valuation;
    this.reorderStatus = props.reorderStatus;
    this.version = props.version;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(params: {
    productId: ProductId;
    location: LocationRef;
    lotRef?: LotRef | null;
  }): InventoryLevel {
    const now = new Date();
    return new InventoryLevel({
      productId: params.productId,
      location: params.location,
      lotRef: params.lotRef ?? null,
      quantity: Quantity.zero(),
      valuation: ValuationSnapshot.empty(),
      reorderStatus: ReorderStatusVO.out(),
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ReconstituteInventoryLevelProps): InventoryLevel {
    return new InventoryLevel(props);
  }

  // ── Mutasyonlar (StockProjectionService tarafından çağrılır) ──

  applyReceipt(quantity: string): void {
    this.quantity = this.quantity.addOnHand(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  applyIssue(quantity: string): void {
    if (Number(quantity) > Number(this.quantity.getOnHand())) {
      throw new Error(
        `Insufficient stock at ${this.location.getLocationId()} for product ${this.productId.toString()}: onHand=${this.quantity.getOnHand()} < issue=${quantity}`,
      );
    }
    this.quantity = this.quantity.subtractOnHand(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  /** ADJUSTMENT pozitif (stoğa ekle) */
  applyAdjustmentPositive(quantity: string): void {
    this.quantity = this.quantity.addOnHand(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  /** ADJUSTMENT negatif (stoktan düş) */
  applyAdjustmentNegative(quantity: string): void {
    if (Number(quantity) > Number(this.quantity.getOnHand())) {
      throw new Error(
        `Adjustment would drive stock negative: onHand=${this.quantity.getOnHand()} < ${quantity}`,
      );
    }
    this.quantity = this.quantity.subtractOnHand(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  applyScrap(quantity: string): void {
    if (Number(quantity) > Number(this.quantity.getOnHand())) {
      throw new Error(
        `Scrap exceeds onHand: ${this.quantity.getOnHand()} < ${quantity}`,
      );
    }
    this.quantity = this.quantity.subtractOnHand(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  applyTransferOut(quantity: string): void {
    this.quantity = this.quantity.markInTransit(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  applyTransferIn(quantity: string): void {
    this.quantity = this.quantity.receiveInTransit(quantity);
    this.touch();
    this.emitLevelChanged();
  }

  /** ReorderEvaluator tarafından çağrılır (low/high stock alarm). */
  updateReorderStatus(newStatus: ReorderStatusVO): void {
    if (this.reorderStatus.getValue() === newStatus.getValue()) return;
    this.reorderStatus = newStatus;
    this.touch();
  }

  // ── Getters ──
  getProductId(): ProductId { return this.productId; }
  getLocation(): LocationRef { return this.location; }
  getLotRef(): LotRef | null { return this.lotRef; }
  getQuantity(): Quantity { return this.quantity; }
  getValuation(): ValuationSnapshot { return this.valuation; }
  getReorderStatus(): ReorderStatusVO { return this.reorderStatus; }
  getVersion(): number { return this.version; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }

  /** Composite identity (DB primary key olarak kullanılır). */
  getCompositeKey(): string {
    const lot = this.lotRef ? this.lotRef.getLotId() : '_';
    return `${this.productId.toString()}::${this.location.getLocationId()}::${lot}`;
  }

  // ── Helpers ──
  private touch(): void {
    this.updatedAt = new Date();
    this.version += 1;
  }

  private emitLevelChanged(): void {
    this.addDomainEvent(
      new StockLevelChangedEvent(
        this.productId.toString(),
        this.location.getLocationId(),
        this.quantity.getOnHand(),
        this.quantity.getAvailable(),
        this.reorderStatus.getValue(),
        this.updatedAt,
      ),
    );
  }
}
