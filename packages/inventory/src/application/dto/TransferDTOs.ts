/**
 * DTOs: Transfer
 */
import { TransferOrder } from '../../domain/aggregates/TransferOrder';

export interface CreateTransferDTO {
  id: string;
  transferNumber?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  lines: ReadonlyArray<{
    productId: string;
    /** Opsiyonel: belirli bir lot zorunlu. Boşsa FEFO otomatik seçer. */
    lotId?: string | null;
    requestedQuantity: string;
    uom: string;
  }>;
  reason?: string | null;
  notes?: string | null;
}

export interface DispatchTransferDTO {
  transferId: string;
  /** Her satır için dispatch miktarı. lotId FEFO tarafından doldurulur. */
  lineDispatches?: ReadonlyArray<{
    productId: string;
    dispatchedQuantity: string;
  }>;
}

export interface ReceiveTransferDTO {
  transferId: string;
  /** Her satır için kabul edilen miktar. */
  lineReceives: ReadonlyArray<{
    productId: string;
    receivedQuantity: string;
  }>;
}

export interface CancelTransferDTO {
  transferId: string;
  reason?: string | null;
}

export interface TransferLineView {
  productId: string;
  lotId: string | null;
  selectedLotId: string | null;
  requestedQuantity: string;
  dispatchedQuantity: string;
  receivedQuantity: string;
  variance: string;
  hasVariance: boolean;
  uom: string;
  isFullyReceived: boolean;
}

export interface TransferView {
  id: string;
  transferNumber: string;
  status: string;
  sourceLocationId: string;
  destinationLocationId: string;
  reason: string | null;
  notes: string | null;
  totalRequested: string;
  totalDispatched: string;
  totalReceived: string;
  totalVariance: string;
  lines: ReadonlyArray<TransferLineView>;
  createdAt: string;
  updatedAt: string;
  dispatchedAt: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  version: number;
}

export function transferLineToView(
  l: import('../../domain/entities/TransferLine').TransferLine,
): TransferLineView {
  return {
    productId: l.getProductId(),
    lotId: l.getLotId(),
    selectedLotId: l.getSelectedLotId(),
    requestedQuantity: l.getRequestedQuantity(),
    dispatchedQuantity: l.getDispatchedQuantity(),
    receivedQuantity: l.getReceivedQuantity(),
    variance: l.getVariance(),
    hasVariance: l.hasVariance(),
    uom: l.getUom(),
    isFullyReceived: l.isFullyReceived(),
  };
}

export function transferToView(t: TransferOrder): TransferView {
  return {
    id: t.getId().getValue(),
    transferNumber: t.getTransferNumber(),
    status: t.getStatus().getKind(),
    sourceLocationId: t.getSourceLocation().getLocationId(),
    destinationLocationId: t.getDestinationLocation().getLocationId(),
    reason: t.getReason(),
    notes: t.getNotes(),
    totalRequested: t.getTotalRequested(),
    totalDispatched: t.getTotalDispatched(),
    totalReceived: t.getTotalReceived(),
    totalVariance: t.getTotalVariance(),
    lines: t.getLines().map(transferLineToView),
    createdAt: t.getCreatedAt().toISOString(),
    updatedAt: t.getUpdatedAt().toISOString(),
    dispatchedAt: t.getDispatchedAt() ? t.getDispatchedAt()!.toISOString() : null,
    receivedAt: t.getReceivedAt() ? t.getReceivedAt()!.toISOString() : null,
    closedAt: t.getClosedAt() ? t.getClosedAt()!.toISOString() : null,
    cancelledAt: t.getCancelledAt() ? t.getCancelledAt()!.toISOString() : null,
    version: t.getVersion(),
  };
}
