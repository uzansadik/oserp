import { ValidationError } from '../errors/ValidationError';
import { InvalidStateError } from '../errors/InvalidStateError';
import { ProductBarcodeAddedEvent } from '../events/ProductBarcodeAddedEvent';
import { ProductBarcodeRemovedEvent } from '../events/ProductBarcodeRemovedEvent';
import { ProductCreatedEvent } from '../events/ProductCreatedEvent';
import { ProductDiscontinuedEvent } from '../events/ProductDiscontinuedEvent';
import { ProductTypeChangedEvent } from '../events/ProductTypeChangedEvent';
import { ReorderPolicyChangedEvent } from '../events/ReorderPolicyChangedEvent';
import {
  Barcode,
  ProductId,
  ProductStatusVO,
  ProductTypeVO,
  ProcurementPolicyVO,
  ReorderPolicy,
  Sku,
  TrackingTypeVO,
  Uom,
} from '../value-objects';
import { AggregateRoot } from './AggregateRoot';

export type CreateProductProps = {
  sku: string;
  name: string;
  description?: string | null;
  type: ProductTypeVO;
  procurementPolicy: ProcurementPolicyVO;
  trackingType?: TrackingTypeVO;
  baseUom?: Uom;
  categoryId?: string | null;
  reorderPolicy?: ReorderPolicy;
  initialBarcode?: Barcode | undefined;
  id?: ProductId;
  createdAt?: Date;
};

export type ReconstituteProductProps = {
  id: ProductId;
  sku: Sku;
  name: string;
  description: string | null;
  type: ProductTypeVO;
  procurementPolicy: ProcurementPolicyVO;
  trackingType: TrackingTypeVO;
  baseUom: Uom;
  categoryId: string | null;
  status: ProductStatusVO;
  reorderPolicy: ReorderPolicy;
  barcodes: ReadonlyArray<Barcode>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Product — Ürün aggregate root (katalog/master data).
 *
 * Sorumluluk:
 *  - Ürün tanımı (SKU, isim, tip, UoM, kategori)
 *  - Tedarik politikası, izleme tipi
 *  - Barkod koleksiyonu
 *  - Reorder policy
 *  - Yaşam döngüsü (ACTIVE/INACTIVE/DISCONTINUED)
 *
 * **İçermez:** fiyat, stok miktarı, kategori hiyerarşisi, lokasyon.
 * (fiyat → PriceList; stok → InventoryLevel; lokasyon → Warehouse)
 */
export class Product extends AggregateRoot {
  private readonly id: ProductId;
  private readonly sku: Sku;
  private name: string;
  private description: string | null;
  private type: ProductTypeVO;
  private procurementPolicy: ProcurementPolicyVO;
  private trackingType: TrackingTypeVO;
  private baseUom: Uom;
  private categoryId: string | null;
  private status: ProductStatusVO;
  private reorderPolicy: ReorderPolicy;
  private readonly barcodes: Map<string, Barcode>;
  private readonly version: number;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: ReconstituteProductProps) {
    super();
    this.id = props.id;
    this.sku = props.sku;
    this.name = props.name;
    this.description = props.description;
    this.type = props.type;
    this.procurementPolicy = props.procurementPolicy;
    this.trackingType = props.trackingType;
    this.baseUom = props.baseUom;
    this.categoryId = props.categoryId;
    this.status = props.status;
    this.reorderPolicy = props.reorderPolicy;
    this.version = props.version;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.barcodes = new Map();
    for (const b of props.barcodes) {
      this.barcodes.set(b.getCode(), b);
    }
  }

  static create(props: CreateProductProps): Product {
    Product.validateName(props.name);
    Product.validateDescription(props.description ?? null);
    Product.validateTrackingAgainstType(
      props.type,
      props.trackingType ?? TrackingTypeVO.none(),
    );

    const id = props.id ?? ProductId.generate();
    const now = props.createdAt ?? new Date();

    const product = new Product({
      id,
      sku: Sku.create(props.sku),
      name: props.name.trim(),
      description: props.description?.trim() || null,
      type: props.type,
      procurementPolicy: props.procurementPolicy,
      trackingType: props.trackingType ?? TrackingTypeVO.none(),
      baseUom: props.baseUom ?? Uom.adet(),
      categoryId: props.categoryId ?? null,
      status: ProductStatusVO.active(),
      reorderPolicy: props.reorderPolicy ?? ReorderPolicy.none(),
      barcodes: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    if (props.initialBarcode) {
      product.addBarcode(props.initialBarcode);
    }

    product.addDomainEvent(
      new ProductCreatedEvent(
        id.toString(),
        product.sku.getValue(),
        product.name,
        product.type.getValue(),
        now,
      ),
    );

    return product;
  }

  static reconstitute(props: ReconstituteProductProps): Product {
    return new Product(props);
  }

  // ── Behavior ─────────────────────────────────────────────────────────

  updateBasicInfo(params: {
    name?: string;
    description?: string | null;
    baseUom?: Uom;
    categoryId?: string | null;
  }): void {
    this.assertNotDiscontinued();
    if (params.name !== undefined) {
      Product.validateName(params.name);
      this.name = params.name.trim();
    }
    if (params.description !== undefined) {
      Product.validateDescription(params.description);
      this.description = params.description?.trim() || null;
    }
    if (params.baseUom !== undefined) {
      this.baseUom = params.baseUom;
    }
    if (params.categoryId !== undefined) {
      this.categoryId = params.categoryId;
    }
    this.touch();
  }

  changeType(newType: ProductTypeVO, occurredOn?: Date): void {
    this.assertNotDiscontinued();
    if (this.type.equals(newType)) {
      return;
    }
    Product.validateTrackingAgainstType(newType, this.trackingType);
    const old = this.type;
    this.type = newType;
    this.touch();
    this.addDomainEvent(
      new ProductTypeChangedEvent(
        this.id.toString(),
        old.getValue(),
        newType.getValue(),
        occurredOn,
      ),
    );
  }

  changeProcurementPolicy(policy: ProcurementPolicyVO): void {
    this.assertNotDiscontinued();
    this.procurementPolicy = policy;
    this.touch();
  }

  changeTrackingType(trackingType: TrackingTypeVO): void {
    this.assertNotDiscontinued();
    Product.validateTrackingAgainstType(this.type, trackingType);
    this.trackingType = trackingType;
    this.touch();
  }

  setReorderPolicy(policy: ReorderPolicy, occurredOn?: Date): void {
    this.assertNotDiscontinued();
    const before = this.reorderPolicy;
    this.reorderPolicy = policy;
    this.touch();
    if (!before.equals(policy)) {
      this.addDomainEvent(
        new ReorderPolicyChangedEvent(
          this.id.toString(),
          policy.getMinQty(),
          policy.getMaxQty(),
          policy.getReorderQty(),
          policy.getSafetyStock(),
          occurredOn,
        ),
      );
    }
  }

  activate(): void {
    if (this.status.isActive()) return;
    if (this.status.isDiscontinued()) {
      throw new InvalidStateError('Cannot reactivate a discontinued product');
    }
    this.status = ProductStatusVO.active();
    this.touch();
  }

  deactivate(): void {
    if (this.status.isInactive()) return;
    if (this.status.isDiscontinued()) {
      throw new InvalidStateError('Discontinued product cannot be deactivated');
    }
    this.status = ProductStatusVO.inactive();
    this.touch();
  }

  discontinue(occurredOn?: Date): void {
    if (this.status.isDiscontinued()) return;
    this.status = ProductStatusVO.discontinued();
    this.touch();
    this.addDomainEvent(
      new ProductDiscontinuedEvent(this.id.toString(), occurredOn),
    );
  }

  addBarcode(barcode: Barcode, occurredOn?: Date): void {
    this.assertNotDiscontinued();
    if (this.barcodes.has(barcode.getCode())) {
      throw new ValidationError(
        `Barcode already attached to this product: ${barcode.getCode()}`,
      );
    }
    // İlk eklenen barkod otomatik primary olur
    const isFirst = this.barcodes.size === 0;
    const final = isFirst ? barcode.markPrimary() : barcode;
    this.barcodes.set(final.getCode(), final);
    this.touch();
    this.addDomainEvent(
      new ProductBarcodeAddedEvent(
        this.id.toString(),
        final.getCode(),
        final.getSymbology(),
        final.isPrimaryBarcode(),
        occurredOn,
      ),
    );
  }

  removeBarcode(code: string, occurredOn?: Date): void {
    this.assertNotDiscontinued();
    const upper = code.trim().toUpperCase();
    if (!this.barcodes.has(upper)) {
      throw new ValidationError(`Barcode not found on this product: ${code}`);
    }
    this.barcodes.delete(upper);
    this.touch();
    this.addDomainEvent(
      new ProductBarcodeRemovedEvent(this.id.toString(), upper, occurredOn),
    );
  }

  // ── Getters ──────────────────────────────────────────────────────────

  getId(): ProductId {
    return this.id;
  }
  getSku(): Sku {
    return this.sku;
  }
  getName(): string {
    return this.name;
  }
  getDescription(): string | null {
    return this.description;
  }
  getType(): ProductTypeVO {
    return this.type;
  }
  getProcurementPolicy(): ProcurementPolicyVO {
    return this.procurementPolicy;
  }
  getTrackingType(): TrackingTypeVO {
    return this.trackingType;
  }
  getBaseUom(): Uom {
    return this.baseUom;
  }
  getCategoryId(): string | null {
    return this.categoryId;
  }
  getStatus(): ProductStatusVO {
    return this.status;
  }
  getReorderPolicy(): ReorderPolicy {
    return this.reorderPolicy;
  }
  getBarcodes(): ReadonlyArray<Barcode> {
    return Array.from(this.barcodes.values());
  }
  getVersion(): number {
    return this.version;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private assertNotDiscontinued(): void {
    if (this.status.isDiscontinued()) {
      throw new InvalidStateError(
        `Discontinued product cannot be modified: ${this.sku.getValue()}`,
      );
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Product name cannot be empty');
    }
    if (name.length > 256) {
      throw new ValidationError('Product name too long (max 256)');
    }
  }

  private static validateDescription(description: string | null): void {
    if (description !== null && description.length > 4096) {
      throw new ValidationError('Description too long (max 4096)');
    }
  }

  private static validateTrackingAgainstType(
    type: ProductTypeVO,
    tracking: TrackingTypeVO,
  ): void {
    if (!tracking.isNone() && !type.isStorable()) {
      throw new ValidationError(
        `Only STORABLE products support LOT/SERIAL tracking (got ${type.getValue()})`,
      );
    }
  }
}
