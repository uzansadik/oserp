import { AggregateRoot } from './AggregateRoot';
import { MovementLine } from './MovementLine';
import { MovementId } from '../value-objects/MovementId';
import { MovementType, MovementTypeVO } from '../value-objects/MovementType';
import { MovementDirection, MovementDirectionVO } from '../value-objects/MovementDirection';
import { DocumentRef } from '../value-objects/DocumentRef';
import { ReasonCode } from '../value-objects/ReasonCode';
import { ValidationError } from '../errors/ValidationError';
import { StockReceivedEvent } from '../events/StockReceivedEvent';
import { StockIssuedEvent } from '../events/StockIssuedEvent';
import { StockTransferredEvent } from '../events/StockTransferredEvent';
import { StockAdjustedEvent } from '../events/StockAdjustedEvent';
import { StockScrappedEvent } from '../events/StockScrappedEvent';

export type CreateStockMovementProps = {
  type: MovementTypeVO;
  documentRef: DocumentRef;
  lines: ReadonlyArray<MovementLine>;
  reasonCode?: ReasonCode | null;
  postedBy: string;
  postedAt?: Date;
  id?: MovementId;
};

export type ReconstituteStockMovementProps = {
  id: MovementId;
  type: MovementTypeVO;
  direction: MovementDirectionVO;
  documentRef: DocumentRef;
  lines: ReadonlyArray<MovementLine>;
  reasonCode: ReasonCode | null;
  postedBy: string;
  postedAt: Date;
};

/**
 * StockMovement — Stok hareketi aggregate root (append-only).
 *
 * Bir kez oluşturulduktan sonra immutable. İptal/reversal yeni bir ters hareket
 * oluşturularak yapılır (Faz 2'de reversal yok; ileride eklenir).
 */
export class StockMovement extends AggregateRoot {
  private readonly id: MovementId;
  private readonly type: MovementTypeVO;
  private readonly direction: MovementDirectionVO;
  private readonly documentRef: DocumentRef;
  private readonly lines: ReadonlyArray<MovementLine>;
  private readonly reasonCode: ReasonCode | null;
  private readonly postedBy: string;
  private readonly postedAt: Date;

  private constructor(props: ReconstituteStockMovementProps) {
    super();
    this.id = props.id;
    this.type = props.type;
    this.direction = props.direction;
    this.documentRef = props.documentRef;
    this.lines = props.lines;
    this.reasonCode = props.reasonCode;
    this.postedBy = props.postedBy;
    this.postedAt = props.postedAt;
  }

  static create(props: CreateStockMovementProps): StockMovement {
    if (props.lines.length === 0) {
      throw new ValidationError('StockMovement must have at least one line');
    }

    // Tip bazlı invariantlar
    const type = props.type;
    const docRef = props.documentRef;

    if (type.requiresReasonCode() && !props.reasonCode) {
      throw new ValidationError(
        `Movement type ${type.getValue()} requires a reason code`,
      );
    }

    // Yön, tip'ten otomatik çıkar
    let direction: MovementDirectionVO;
    if (type.isTransfer()) {
      direction = MovementDirectionVO.internal();
    } else if (type.isReceipt()) {
      direction = MovementDirectionVO.in();
    } else {
      // ISSUE, ADJUSTMENT, SCRAP → OUT (ADJUSTMENT+/- ayrımı qty sign ile yapılır)
      direction = MovementDirectionVO.out();
    }

    const id = props.id ?? MovementId.generate();
    const postedAt = props.postedAt ?? new Date();

    // Satır invariantları
    for (const line of props.lines) {
      if (type.isReceipt() && !line.getToLocation()) {
        throw new ValidationError(
          `RECEIPT satırı için toLocation zorunlu (product ${line.getProductId().toString()})`,
        );
      }
      if (type.isIssue() && !line.getFromLocation()) {
        throw new ValidationError(
          `ISSUE satırı için fromLocation zorunlu (product ${line.getProductId().toString()})`,
        );
      }
      if (type.isTransfer()) {
        if (!line.getFromLocation() || !line.getToLocation()) {
          throw new ValidationError(
            `TRANSFER satırı için fromLocation ve toLocation zorunlu (product ${line.getProductId().toString()})`,
          );
        }
        if (line.getFromLocation()!.getLocationId() === line.getToLocation()!.getLocationId()) {
          throw new ValidationError('TRANSFER: fromLocation ve toLocation farklı olmalı');
        }
      }
    }

    const movement = new StockMovement({
      id,
      type,
      direction,
      documentRef: docRef,
      lines: props.lines,
      reasonCode: props.reasonCode ?? null,
      postedBy: props.postedBy,
      postedAt,
    });

    // Domain event'lerini üret
    movement.emitEventsForLines();
    return movement;
  }

  static reconstitute(props: ReconstituteStockMovementProps): StockMovement {
    return new StockMovement(props);
  }

  private emitEventsForLines(): void {
    const t = this.type.getValue();
    const aggregateId = this.id.toString();

    for (const line of this.lines) {
      const basePayload = {
        movementId: aggregateId,
        productId: line.getProductId().toString(),
        quantity: line.getQuantity(),
        uom: line.getUom(),
        lotId: line.getLotRef()?.getLotId() ?? null,
        documentType: this.documentRef.getType(),
        documentId: this.documentRef.getDocumentId(),
        reasonCode: this.reasonCode?.getValue() ?? null,
        postedBy: this.postedBy,
        postedAt: this.postedAt,
      };

      if (t === MovementType.RECEIPT) {
        this.addDomainEvent(
          new StockReceivedEvent(
            aggregateId,
            basePayload.productId,
            line.getToLocation()!.getLocationId(),
            basePayload.quantity,
            basePayload.lotId,
            basePayload.documentId,
            this.postedAt,
          ),
        );
      } else if (t === MovementType.ISSUE) {
        this.addDomainEvent(
          new StockIssuedEvent(
            aggregateId,
            basePayload.productId,
            line.getFromLocation()!.getLocationId(),
            basePayload.quantity,
            basePayload.lotId,
            basePayload.documentId,
            this.postedAt,
          ),
        );
      } else if (t === MovementType.TRANSFER) {
        this.addDomainEvent(
          new StockTransferredEvent(
            aggregateId,
            basePayload.productId,
            line.getFromLocation()!.getLocationId(),
            line.getToLocation()!.getLocationId(),
            basePayload.quantity,
            basePayload.lotId,
            this.postedAt,
          ),
        );
      } else if (t === MovementType.ADJUSTMENT) {
        this.addDomainEvent(
          new StockAdjustedEvent(
            aggregateId,
            basePayload.productId,
            // ADJUSTMENT'da from/to aynı lokasyon (delta +/- quantity)
            line.getFromLocation()?.getLocationId() ?? line.getToLocation()!.getLocationId(),
            basePayload.quantity,
            this.reasonCode!.getValue(),
            this.postedAt,
          ),
        );
      } else if (t === MovementType.SCRAP) {
        this.addDomainEvent(
          new StockScrappedEvent(
            aggregateId,
            basePayload.productId,
            line.getFromLocation()!.getLocationId(),
            basePayload.quantity,
            this.reasonCode!.getValue(),
            this.postedAt,
          ),
        );
      }
    }
  }

  // ── Getters ──
  getId(): MovementId { return this.id; }
  getType(): MovementTypeVO { return this.type; }
  getDirection(): MovementDirectionVO { return this.direction; }
  getDocumentRef(): DocumentRef { return this.documentRef; }
  getLines(): ReadonlyArray<MovementLine> { return this.lines; }
  getReasonCode(): ReasonCode | null { return this.reasonCode; }
  getPostedBy(): string { return this.postedBy; }
  getPostedAt(): Date { return this.postedAt; }
}
