/**
 * TransferOrder Aggregate
 *
 * İki lokasyon arasındaki stok transferini yönetir. 2-step:
 *
 *   1) DISPATCH  : kaynak lokasyondan inTransit'e stok çıkışı
 *                  (source.onHand -= qty, source.inTransit += qty)
 *   2) RECEIVE   : hedef lokasyona inTransit'ten stok girişi
 *                  (target.onHand += qty, source.inTransit -= qty)
 *
 * Identity: transferId
 * Concurrency: optimistic lock (`version`)
 *
 * Lifecycle:
 *   DRAFT → DISPATCHED → IN_TRANSIT → RECEIVED → CLOSED
 *     ↓
 *   CANCELLED (sadece DRAFT'tan — dispatch sonrası yolda olan transfer iptal
 *   edilemez, void edilir/reverse edilir)
 *
 * Variance handling: receive sırasında hedef gerçekte ne kadar aldıysa o
 * kaydedilir. Variance > 0 ise (kayıp/hasar), receive sırasında dispatch'in
 * o kadar azı target'a yazılır, kalan inTransit'te kalır — close sırasında
 * write-off yapılabilir.
 */
import { AggregateRoot } from '../entities/AggregateRoot';
import { TransferId } from '../value-objects/TransferId';
import { TransferStatus } from '../value-objects/TransferStatus';
import { TransferLine } from '../entities/TransferLine';
import { LocationRef } from '../value-objects/LocationRef';
import {
  TransferCreatedEvent,
  TransferDispatchedEvent,
  TransferInTransitEvent,
  TransferReceivedEvent,
  TransferClosedEvent,
  TransferCancelledEvent,
} from '../events/TransferEvents';

export interface TransferProps {
  id: TransferId;
  transferNumber: string;
  sourceLocation: LocationRef;
  destinationLocation: LocationRef;
  status: TransferStatus;
  lines: ReadonlyArray<TransferLine>;
  reason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  version: number;
}

export class TransferOrder extends AggregateRoot {
  private constructor(private readonly props: TransferProps) {
    super();
    Object.freeze(this.props.lines);
  }

  static create(opts: {
    id: string;
    transferNumber: string;
    sourceLocation: LocationRef;
    destinationLocation: LocationRef;
    lines: ReadonlyArray<TransferLine>;
    reason?: string | null;
    notes?: string | null;
  }): TransferOrder {
    if (!opts.transferNumber) throw new Error('transferNumber required');
    if (opts.sourceLocation.getLocationId() === opts.destinationLocation.getLocationId()) {
      throw new Error('Source and destination locations must differ');
    }
    if (!opts.lines || opts.lines.length === 0) {
      throw new Error('Transfer must have at least one line');
    }
    const now = new Date();
    const transfer = new TransferOrder({
      id: TransferId.of(opts.id),
      transferNumber: opts.transferNumber,
      sourceLocation: opts.sourceLocation,
      destinationLocation: opts.destinationLocation,
      status: TransferStatus.draft(),
      lines: opts.lines,
      reason: opts.reason ?? null,
      notes: opts.notes ?? null,
      createdAt: now,
      updatedAt: now,
      dispatchedAt: null,
      receivedAt: null,
      closedAt: null,
      cancelledAt: null,
      version: 1,
    });
    transfer.addDomainEvent(
      new TransferCreatedEvent({
        transferId: opts.id,
        transferNumber: opts.transferNumber,
        sourceLocationId: opts.sourceLocation.getLocationId(),
        destinationLocationId: opts.destinationLocation.getLocationId(),
        lines: opts.lines.map((l) => ({
          productId: l.getProductId(),
          lotId: l.getLotId(),
          requestedQuantity: l.getRequestedQuantity(),
          uom: l.getUom(),
        })),
        reason: opts.reason ?? null,
        occurredAt: now,
      }),
    );
    return transfer;
  }

  static reconstitute(props: TransferProps): TransferOrder {
    return new TransferOrder(props);
  }

  // ── Lifecycle transitions ──

  /**
   * Dispatch: source.onHand -= qty, source.inTransit += qty.
   * Çağıran taraf (TransferService) aynı zamanda lot dispatch + InventoryLevel
   * update yapar.
   *
   * @param lineDispatches Her satır için: lotId + dispatchedQty
   */
  dispatch(lineDispatches: ReadonlyArray<{ productId: string; lotId: string; dispatchedQty: string }>): TransferOrder {
    if (!this.props.status.canTransitionTo(TransferStatus.dispatched())) {
      throw new Error(`Cannot dispatch transfer in status ${this.props.status.toString()}`);
    }
    if (lineDispatches.length !== this.props.lines.length) {
      throw new Error(
        `Dispatch expects ${this.props.lines.length} lines, got ${lineDispatches.length}`,
      );
    }

    const newLines: TransferLine[] = [];
    for (const original of this.props.lines) {
      const dispatchInfo = lineDispatches.find(
        (d) => d.productId === original.getProductId(),
      );
      if (!dispatchInfo) {
        throw new Error(
          `Missing dispatch info for product ${original.getProductId()}`,
        );
      }
      newLines.push(
        original.withDispatch(dispatchInfo.lotId, dispatchInfo.dispatchedQty),
      );
    }

    const now = new Date();
    const next = this.mutate({
      status: TransferStatus.dispatched(),
      lines: newLines,
      dispatchedAt: now,
    });
    next.addDomainEvent(
      new TransferDispatchedEvent({
        transferId: this.props.id.getValue(),
        transferNumber: this.props.transferNumber,
        sourceLocationId: this.props.sourceLocation.getLocationId(),
        destinationLocationId: this.props.destinationLocation.getLocationId(),
        lines: newLines.map((l) => ({
          productId: l.getProductId(),
          lotId: l.getSelectedLotId(),
          dispatchedQuantity: l.getDispatchedQuantity(),
        })),
        occurredAt: now,
      }),
    );
    return next;
  }

  /**
   * InTransit: dispatch sonrası fiziksel transfer başladı.
   * (Şu an dispatch ile aynı anda dispatch event'i de üretiyoruz; bu metot
   * opsiyonel bir ara adım — gerçek dünyada "yola çıktı" bilgisi dispatch'ten
   * saatler/günler sonra gelir.)
   */
  markInTransit(): TransferOrder {
    if (!this.props.status.canTransitionTo(TransferStatus.inTransit())) {
      throw new Error(
        `Cannot mark in-transit from ${this.props.status.toString()}`,
      );
    }
    const next = this.mutate({ status: TransferStatus.inTransit() });
    next.addDomainEvent(
      new TransferInTransitEvent({
        transferId: this.props.id.getValue(),
        occurredAt: new Date(),
      }),
    );
    return next;
  }

  /**
   * Receive: target.onHand += qty, source.inTransit -= qty.
   * Her satır için ayrı received miktarı verilebilir (partial receive).
   */
  receive(lineReceives: ReadonlyArray<{ productId: string; receivedQuantity: string }>): TransferOrder {
    if (!this.props.status.canTransitionTo(TransferStatus.received())) {
      throw new Error(
        `Cannot receive transfer in status ${this.props.status.toString()}`,
      );
    }
    const newLines: TransferLine[] = [];
    for (const original of this.props.lines) {
      const recvInfo = lineReceives.find(
        (r) => r.productId === original.getProductId(),
      );
      if (!recvInfo) {
        throw new Error(
          `Missing receive info for product ${original.getProductId()}`,
        );
      }
      newLines.push(original.withReceive(recvInfo.receivedQuantity));
    }
    const now = new Date();
    const next = this.mutate({
      status: TransferStatus.received(),
      lines: newLines,
      receivedAt: now,
    });
    next.addDomainEvent(
      new TransferReceivedEvent({
        transferId: this.props.id.getValue(),
        destinationLocationId: this.props.destinationLocation.getLocationId(),
        lines: newLines.map((l) => ({
          productId: l.getProductId(),
          lotId: l.getSelectedLotId(),
          receivedQuantity: l.getReceivedQuantity(),
          variance: l.getVariance(),
        })),
        occurredAt: now,
      }),
    );
    return next;
  }

  /**
   * Close: tüm satırlar reconcile edildi, faturalandırılabilir.
   * Variance'lar artık audit trail'e işlenir (write-off servisi ayrıca
   * çağrılabilir).
   */
  close(): TransferOrder {
    if (!this.props.status.canTransitionTo(TransferStatus.closed())) {
      throw new Error(`Cannot close transfer in status ${this.props.status.toString()}`);
    }
    const now = new Date();
    const next = this.mutate({
      status: TransferStatus.closed(),
      closedAt: now,
    });
    next.addDomainEvent(
      new TransferClosedEvent({
        transferId: this.props.id.getValue(),
        totalVariance: this.props.lines
          .reduce((s, l) => s + Number(l.getVariance()), 0)
          .toString(),
        occurredAt: now,
      }),
    );
    return next;
  }

  /**
   * Cancel: sadece DRAFT state'te. Dispatch sonrası yola çıkan transfer
   * iptal edilemez (void/reverse edilir).
   */
  cancel(reason: string | null = null): TransferOrder {
    if (!this.props.status.canTransitionTo(TransferStatus.cancelled())) {
      throw new Error(
        `Cannot cancel transfer in status ${this.props.status.toString()} (only DRAFT)`,
      );
    }
    const now = new Date();
    const next = this.mutate({
      status: TransferStatus.cancelled(),
      cancelledAt: now,
    });
    next.addDomainEvent(
      new TransferCancelledEvent({
        transferId: this.props.id.getValue(),
        reason,
        occurredAt: now,
      }),
    );
    return next;
  }

  // ── Getters ──

  getId(): TransferId {
    return this.props.id;
  }
  getTransferNumber(): string {
    return this.props.transferNumber;
  }
  getSourceLocation(): LocationRef {
    return this.props.sourceLocation;
  }
  getDestinationLocation(): LocationRef {
    return this.props.destinationLocation;
  }
  getStatus(): TransferStatus {
    return this.props.status;
  }
  getLines(): ReadonlyArray<TransferLine> {
    return this.props.lines;
  }
  getReason(): string | null {
    return this.props.reason;
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
  getDispatchedAt(): Date | null {
    return this.props.dispatchedAt;
  }
  getReceivedAt(): Date | null {
    return this.props.receivedAt;
  }
  getClosedAt(): Date | null {
    return this.props.closedAt;
  }
  getCancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  getVersion(): number {
    return this.props.version;
  }

  getTotalRequested(): string {
    return this.props.lines
      .reduce((s, l) => s + Number(l.getRequestedQuantity()), 0)
      .toString();
  }

  getTotalDispatched(): string {
    return this.props.lines
      .reduce((s, l) => s + Number(l.getDispatchedQuantity()), 0)
      .toString();
  }

  getTotalReceived(): string {
    return this.props.lines
      .reduce((s, l) => s + Number(l.getReceivedQuantity()), 0)
      .toString();
  }

  getTotalVariance(): string {
    return this.props.lines
      .reduce((s, l) => s + Number(l.getVariance()), 0)
      .toString();
  }

  // ── Helpers ──

  private mutate(partial: Partial<TransferProps>): TransferOrder {
    return new TransferOrder({
      ...this.props,
      ...partial,
      updatedAt: new Date(),
      version: this.props.version + 1,
    });
  }
}
