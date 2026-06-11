// packages/inventory/src/infrastructure/persistance/mappers/TransferMapper.ts

import { TransferOrder, type TransferProps } from '@oserp-community/inventory/domain/aggregates/TransferOrder';
import { TransferLine } from '@oserp-community/inventory/domain/entities/TransferLine';
import { TransferLineRef, TransferId } from '@oserp-community/inventory/domain/value-objects/TransferId';
import { TransferStatus } from '@oserp-community/inventory/domain/value-objects/TransferStatus';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import type {
  InvTransferRow,
  InvTransferLineRow,
  InvTransferLineInsert,
} from '../schemas/inv.transfer.schema';

export const TransferMapper = {
  toDomain(header: InvTransferRow, lines: ReadonlyArray<InvTransferLineRow>): TransferOrder {
    const transferLines = lines.map((row) =>
      TransferLine.create({
        ref: TransferLineRef.of(row.productId, row.lotId),
        requestedQuantity: row.requestedQuantity,
        uom: row.uom,
        selectedLotId: row.selectedLotId,
        dispatchedQuantity: row.dispatchedQuantity,
        receivedQuantity: row.receivedQuantity,
        notes: row.notes,
      }),
    );
    const props: TransferProps = {
      id: TransferId.of(header.id),
      transferNumber: header.transferNumber,
      sourceLocation: LocationRef.create(header.sourceLocationId),
      destinationLocation: LocationRef.create(header.destinationLocationId),
      status: TransferStatus.fromKind(
        header.status as 'DRAFT' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'CLOSED' | 'CANCELLED',
      ),
      lines: transferLines,
      reason: header.reason,
      notes: header.notes,
      createdAt: header.createdAt,
      updatedAt: header.updatedAt,
      dispatchedAt: header.dispatchedAt,
      receivedAt: header.receivedAt,
      closedAt: header.closedAt,
      cancelledAt: header.cancelledAt,
      version: header.version,
    };
    return TransferOrder.reconstitute(props);
  },

  toHeaderRow(t: TransferOrder): InvTransferRow {
    return {
      id: t.getId().getValue(),
      transferNumber: t.getTransferNumber(),
      sourceLocationId: t.getSourceLocation().getLocationId(),
      destinationLocationId: t.getDestinationLocation().getLocationId(),
      status: t.getStatus().getKind(),
      reason: t.getReason(),
      notes: t.getNotes(),
      createdAt: t.getCreatedAt(),
      updatedAt: t.getUpdatedAt(),
      dispatchedAt: t.getDispatchedAt(),
      receivedAt: t.getReceivedAt(),
      closedAt: t.getClosedAt(),
      cancelledAt: t.getCancelledAt(),
      version: t.getVersion(),
    };
  },

  toLineRow(transferId: string, line: TransferLine): InvTransferLineInsert {
    return {
      id: '',
      transferId,
      productId: line.getProductId(),
      lotId: line.getLotId(),
      selectedLotId: line.getSelectedLotId(),
      requestedQuantity: line.getRequestedQuantity(),
      dispatchedQuantity: line.getDispatchedQuantity(),
      receivedQuantity: line.getReceivedQuantity(),
      uom: line.getUom(),
      notes: line.getNotes(),
    };
  },
};
