/**
 * Lot DTOs — wire-format types
 */
import { ExpiryDate } from '../../domain/value-objects/ExpiryDate';
import { Lot } from '../../domain/entities/Lot';
import { LotAggregate } from '../../domain/aggregates/LotAggregate';
import { LotId } from '../../domain/value-objects/LotId';
import { LotStatus } from '../../domain/value-objects/LotStatus';
import { SerialNumber } from '../../domain/value-objects/SerialNumber';

export interface CreateLotDTO {
  id?: string | undefined;
  productId: string;
  locationId: string;
  quantity: string;
  uom: string;
  expiryDate?: string | null | undefined;
  mfgDate?: string | null | undefined;
  supplierLotCode?: string | null | undefined;
  serialNumbers?: string[] | undefined;
  notes?: string | null | undefined;
}

export interface DispatchLotDTO {
  productId: string;
  locationId: string;
  requestedQuantity: string;
  asOf?: string | undefined;
  reason?: string | undefined;
}

export interface ExpireLotsDTO {
  productId?: string;
  locationId?: string;
  at: string;
}

export interface QuarantineLotDTO {
  lotId: string;
  reason?: string | null;
}

export interface AllocateSerialsDTO {
  lotId: string;
  serialNumbers: string[];
}

export interface LotView {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: string;
  uom: string;
  status: string;
  expiryDate: string | null;
  mfgDate: string | null;
  receivedAt: string;
  supplierLotCode: string | null;
  serialNumbers: string[];
  notes: string | null;
  version: number;
}

export function lotToView(l: Lot): LotView {
  return {
    id: l.getId().getValue(),
    productId: l.getProductId(),
    locationId: l.getLocationId(),
    quantityOnHand: l.getQuantityOnHand(),
    uom: l.getUom(),
    status: l.getStatus().getKind(),
    expiryDate: l.getExpiryDate().toJSON(),
    mfgDate: l.getMfgDate() ? l.getMfgDate()!.toISOString() : null,
    receivedAt: l.getReceivedAt().toISOString(),
    supplierLotCode: l.getSupplierLotCode(),
    serialNumbers: l.getSerialNumbers().map((s) => s.getValue()),
    notes: l.getNotes(),
    version: l.getVersion(),
  };
}

export interface AggregateView {
  productId: string;
  locationId: string;
  totalAvailable: string;
  lotCount: number;
  lots: LotView[];
}

export function aggregateToView(a: LotAggregate, at: Date = new Date()): AggregateView {
  return {
    productId: a.getProductId(),
    locationId: a.getLocationId(),
    totalAvailable: a.getTotalAvailable(at),
    lotCount: a.getLots().length,
    lots: a.getLots().map(lotToView),
  };
}

export interface DispatchAllocationView {
  lotId: string;
  quantity: string;
}

export interface DispatchResultView {
  allocations: DispatchAllocationView[];
  totalAllocated: string;
  remaining: string;
}

export function makeLot(props: {
  id: string;
  productId: string;
  locationId: string;
  quantity: string;
  uom: string;
  expiryDate?: string | null;
  mfgDate?: string | null;
  supplierLotCode?: string | null;
  serialNumbers?: string[];
  notes?: string | null;
}): Lot {
  return Lot.create({
    id: LotId.of(props.id),
    productId: props.productId,
    locationId: props.locationId,
    quantityOnHand: props.quantity,
    uom: props.uom,
    status: LotStatus.available(),
    expiryDate: ExpiryDate.fromISO(props.expiryDate ?? null),
    mfgDate: props.mfgDate ? new Date(props.mfgDate) : null,
    receivedAt: new Date(),
    supplierLotCode: props.supplierLotCode ?? null,
    serialNumbers: (props.serialNumbers ?? []).map((s) => SerialNumber.of(s)),
    notes: props.notes ?? null,
    version: 1,
  });
}
