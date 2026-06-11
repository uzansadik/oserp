/**
 * DTO: PriceList DTOs
 *
 * Wire-format DTOs for create/add-entry/update-entry/archive/calculate.
 */
import { Currency } from '../../domain/value-objects/Currency';
import { DiscountType } from '../../domain/value-objects/DiscountType';
import { PriceList } from '../../domain/aggregates/PriceList';
import { PriceListEntry } from '../../domain/entities/PriceListEntry';
import { PriceListScope } from '../../domain/value-objects/PriceListScope';
import { PricingDecision } from '../../domain/value-objects/PricingDecision';

export interface CreatePriceListDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scopeKind: 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP';
  scopeTargetId?: string | null;
  baseCurrency: string;
  activeFrom: string; // ISO
  activeTo?: string | null;
}

export interface AddPriceListEntryDTO {
  id: string;
  priceListId: string;
  productId: string;
  unitPrice: number;
  currency: string;
  discountKind: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE';
  discountPercent?: number | undefined;
  discountFixedAmount?: number | undefined;
  overridePrice?: number | undefined;
  minQuantity?: number | undefined;
  effectiveFrom: string;
  effectiveTo?: string | null | undefined;
}

export interface UpdatePriceListEntryDTO {
  priceListId: string;
  oldEntryId: string;
  newEntry: AddPriceListEntryDTO;
}

export interface ArchivePriceListDTO {
  priceListId: string;
}

export interface CalculatePriceDTO {
  productId: string;
  quantity: number;
  customerId?: string | null | undefined;
  customerGroupId?: string | null | undefined;
  targetCurrency: string;
  asOf?: string | undefined;
}

export interface PriceListView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: { kind: string; targetId: string | null };
  baseCurrency: string;
  status: string;
  version: number;
  activeFrom: string;
  activeTo: string | null;
  entryCount: number;
}

export interface PriceListEntryView {
  id: string;
  priceListId: string;
  productId: string;
  unitPrice: number;
  currency: string;
  discount: string;
  discountPercent: number | null;
  discountFixedAmount: number | null;
  overridePrice: number | null;
  minQuantity: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export function priceListToView(l: PriceList): PriceListView {
  return {
    id: l.getId(),
    code: l.getCode(),
    name: l.getName(),
    description: l.getDescription(),
    scope: { kind: l.getScope().getKind(), targetId: l.getScope().getTargetId() },
    baseCurrency: l.getBaseCurrency().getCode(),
    status: l.getStatus(),
    version: l.getVersion(),
    activeFrom: l.getActiveFrom().toISOString(),
    activeTo: l.getActiveTo() ? l.getActiveTo()!.toISOString() : null,
    entryCount: l.getEntries().length,
  };
}

export function entryToView(e: PriceListEntry): PriceListEntryView {
  return {
    id: e.getId(),
    priceListId: e.getPriceListId(),
    productId: e.getProductId(),
    unitPrice: e.getUnitPrice(),
    currency: e.getCurrency().getCode(),
    discount: e.getDiscount().getKind(),
    discountPercent: e.getDiscountPercent(),
    discountFixedAmount: e.getDiscountFixedAmount(),
    overridePrice: e.getOverridePrice(),
    minQuantity: e.getMinQuantity(),
    effectiveFrom: e.getEffectiveFrom().toISOString(),
    effectiveTo: e.getEffectiveTo() ? e.getEffectiveTo()!.toISOString() : null,
  };
}

export interface PricingDecisionView {
  productId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  listPrice: number;
  appliedDiscount: string;
  discountAmount: number;
  appliedPriceListId: string | null;
  appliedPriceListCode: string | null;
  appliedEntryId: string | null;
  lineSubtotal: number;
  trace: ReadonlyArray<{ step: number; description: string }>;
}

export function decisionToView(d: PricingDecision): PricingDecisionView {
  return {
    productId: d.getProductId(),
    quantity: d.getQuantity(),
    unitPrice: d.getUnitPrice(),
    currency: d.getCurrency().getCode(),
    listPrice: d.getListPrice(),
    appliedDiscount: d.getAppliedDiscount().getKind(),
    discountAmount: d.getDiscountAmount(),
    appliedPriceListId: d.getAppliedPriceListId(),
    appliedPriceListCode: d.getAppliedPriceListCode(),
    appliedEntryId: d.getAppliedEntryId(),
    lineSubtotal: d.getLineSubtotal(),
    trace: d.getTrace(),
  };
}

export function makeScope(dto: CreatePriceListDTO): PriceListScope {
  if (dto.scopeKind === 'GLOBAL') return PriceListScope.global();
  if (dto.scopeKind === 'CUSTOMER') {
    if (!dto.scopeTargetId) throw new Error('CUSTOMER scope requires scopeTargetId');
    return PriceListScope.customer(dto.scopeTargetId);
  }
  if (dto.scopeKind === 'CUSTOMER_GROUP') {
    if (!dto.scopeTargetId) throw new Error('CUSTOMER_GROUP scope requires scopeTargetId');
    return PriceListScope.customerGroup(dto.scopeTargetId);
  }
  throw new Error(`Unknown scope kind: ${dto.scopeKind as string}`);
}

export function makeDiscount(kind: AddPriceListEntryDTO['discountKind']): DiscountType {
  switch (kind) {
    case 'NONE':
      return DiscountType.none();
    case 'PERCENTAGE':
      return DiscountType.percentage();
    case 'FIXED_AMOUNT':
      return DiscountType.fixedAmount();
    case 'OVERRIDE_PRICE':
      return DiscountType.overridePrice();
    default:
      throw new Error(`Unknown discount kind: ${kind as string}`);
  }
}

export function makeCurrency(code: string): Currency {
  return Currency.of(code);
}
