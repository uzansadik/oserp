/**
 * TransferLine — transfer içindeki immutable bir kalem.
 *
 * Bir satır = (productId, lotId?) + requestedQuantity +
 * (dispatch sonrası) actualDispatchedQuantity + (receive sonrası)
 * actualReceivedQuantity + variance.
 *
 * Lifecycle:
 *   create  : requestedQuantity zorunlu, dispatched=received=0
 *   dispatch: dispatched = requested (full) veya partial
 *   receive : received = dispatched - variance (full/partial)
 *   close   : variance = dispatched - received (snapshot)
 */
import { TransferLineRef } from '../value-objects/TransferId';

export interface TransferLineProps {
  ref: TransferLineRef;
  requestedQuantity: string; // decimal string
  uom: string;
  /** Dispatch sırasında FEFO'nun seçtiği lot (eğer manualLotId verilmediyse). */
  selectedLotId: string | null;
  /** Dispatch sonrası gerçekte yola çıkan miktar (≤ requested). */
  dispatchedQuantity: string;
  /** Receive sonrası kabul edilen miktar (≤ dispatched). */
  receivedQuantity: string;
  notes: string | null;
}

export class TransferLine {
  private constructor(private readonly props: TransferLineProps) {
    Object.freeze(this.props);
  }

  static create(props: TransferLineProps): TransferLine {
    if (!props.ref) throw new Error('TransferLine requires ref');
    if (!props.requestedQuantity || Number(props.requestedQuantity) <= 0) {
      throw new Error(
        `TransferLine requestedQuantity must be positive: ${props.requestedQuantity}`,
      );
    }
    if (!props.uom || props.uom.trim() === '') {
      throw new Error('TransferLine uom is required');
    }
    if (Number(props.dispatchedQuantity) < 0) {
      throw new Error(
        `TransferLine dispatchedQuantity cannot be negative: ${props.dispatchedQuantity}`,
      );
    }
    if (Number(props.receivedQuantity) < 0) {
      throw new Error(
        `TransferLine receivedQuantity cannot be negative: ${props.receivedQuantity}`,
      );
    }
    return new TransferLine(props);
  }

  /**
   * Dispatch sırasında: FEFO'nun seçtiği lot'u ve gerçek yola çıkan miktarı
   * kayıt altına al.
   */
  withDispatch(lotId: string, dispatchedQty: string): TransferLine {
    if (Number(dispatchedQty) <= 0) {
      throw new Error(`Dispatched quantity must be positive: ${dispatchedQty}`);
    }
    if (Number(dispatchedQty) > Number(this.props.requestedQuantity)) {
      throw new Error(
        `Dispatched ${dispatchedQty} > requested ${this.props.requestedQuantity}`,
      );
    }
    return TransferLine.create({
      ...this.props,
      selectedLotId: lotId,
      dispatchedQuantity: dispatchedQty,
    });
  }

  /**
   * Receive sırasında: kabul edilen miktarı kayıt altına al.
   * Variance = dispatched - received (kayıp/hasar/fark).
   */
  withReceive(receivedQty: string): TransferLine {
    if (Number(receivedQty) < 0) {
      throw new Error(`Received quantity cannot be negative: ${receivedQty}`);
    }
    if (Number(receivedQty) > Number(this.props.dispatchedQuantity)) {
      throw new Error(
        `Received ${receivedQty} > dispatched ${this.props.dispatchedQuantity}`,
      );
    }
    return TransferLine.create({
      ...this.props,
      receivedQuantity: receivedQty,
    });
  }

  getRef(): TransferLineRef {
    return this.props.ref;
  }
  getProductId(): string {
    return this.props.ref.getProductId();
  }
  getLotId(): string | null {
    return this.props.ref.getLotId();
  }
  getRequestedQuantity(): string {
    return this.props.requestedQuantity;
  }
  getUom(): string {
    return this.props.uom;
  }
  getSelectedLotId(): string | null {
    return this.props.selectedLotId;
  }
  getDispatchedQuantity(): string {
    return this.props.dispatchedQuantity;
  }
  getReceivedQuantity(): string {
    return this.props.receivedQuantity;
  }

  /**
   * Variance (kayıp/hasar/fark): dispatched - received.
   * Pozitifse gerçek kayıp; 0 ise tam teslim; negatif olamaz (withReceive
   * doğrular).
   */
  getVariance(): string {
    return (
      Number(this.props.dispatchedQuantity) - Number(this.props.receivedQuantity)
    ).toString();
  }

  hasVariance(): boolean {
    return Number(this.getVariance()) > 0;
  }

  isFullyReceived(): boolean {
    return (
      Number(this.props.receivedQuantity) === Number(this.props.dispatchedQuantity) &&
      Number(this.props.dispatchedQuantity) > 0
    );
  }

  getNotes(): string | null {
    return this.props.notes;
  }

  equals(other: TransferLine): boolean {
    return other instanceof TransferLine && this.props.ref.equals(other.props.ref);
  }
}
