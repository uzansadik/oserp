/**
 * Handlers: PriceList use cases
 *
 *   - CreatePriceListHandler: create a new DRAFT PriceList
 *   - AddEntryHandler: append an entry to a DRAFT/ACTIVE list
 *   - UpdateEntryHandler: replace an entry (immutable) by closing + adding
 *   - ArchivePriceListHandler: archive a list
 *   - ActivatePriceListHandler: DRAFT -> ACTIVE
 *   - CalculatePriceHandler: compute price for product+customer+currency
 *   - GetPriceListHandler: read by id
 *   - ListPriceListsHandler: search by criteria
 */
import { Currency } from '../../domain/value-objects/Currency';
import { DiscountType } from '../../domain/value-objects/DiscountType';
import { ExchangeRate } from '../../domain/value-objects/ExchangeRate';
import { PriceList } from '../../domain/aggregates/PriceList';
import { PriceListEntry } from '../../domain/entities/PriceListEntry';
import { PriceListScope } from '../../domain/value-objects/PriceListScope';
import { PricingDecision } from '../../domain/value-objects/PricingDecision';
import { ExchangeRateProvider } from '../ports/ExchangeRateProviderPort';
import { PriceListRepository } from '../ports/PriceListRepositoryPort';
import { PricingCalculator, PricingRequest } from '../ports/PricingCalculatorPort';
import {
  AddPriceListEntryDTO,
  ArchivePriceListDTO,
  CalculatePriceDTO,
  CreatePriceListDTO,
  UpdatePriceListEntryDTO,
} from '../dto/PriceListDTOs';

export class CreatePriceListHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(dto: CreatePriceListDTO): Promise<string> {
    const baseCurrency = Currency.of(dto.baseCurrency);
    const scope = makeScope(dto);
    const list = PriceList.create({
      id: dto.id,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      scope,
      baseCurrency,
      activeFrom: new Date(dto.activeFrom),
      activeTo: dto.activeTo ? new Date(dto.activeTo) : null,
    });
    await this.repo.save(list);
    this.publishEvents(list);
    return list.getId();
  }
  private publishEvents(list: PriceList): void {
    const events = list.pullDomainEvents();
    // Outbox dispatch handled at the application bootstrap; in MVP we just
    // log/ack here. For real deployments use a unit-of-work that writes
    // outbox rows transactionally.
    void events;
  }
}

export class ActivatePriceListHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(priceListId: string): Promise<void> {
    const list = await this.repo.findById(priceListId);
    if (!list) throw new Error(`PriceList not found: ${priceListId}`);
    list.activate();
    await this.repo.save(list);
    void list.pullDomainEvents();
  }
}

export class AddEntryHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(dto: AddPriceListEntryDTO): Promise<string> {
    const list = await this.repo.findById(dto.priceListId);
    if (!list) throw new Error(`PriceList not found: ${dto.priceListId}`);

    const entry = PriceListEntry.create({
      id: dto.id,
      priceListId: dto.priceListId,
      productId: dto.productId,
      unitPrice: dto.unitPrice,
      currency: Currency.of(dto.currency),
      discount: makeDiscount(dto.discountKind),
      discountPercent: dto.discountPercent ?? null,
      discountFixedAmount: dto.discountFixedAmount ?? null,
      overridePrice: dto.overridePrice ?? null,
      minQuantity: dto.minQuantity ?? 1,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdAt: new Date(),
    });
    list.addEntry(entry);
    await this.repo.save(list);
    void list.pullDomainEvents();
    return entry.getId();
  }
}

export class UpdateEntryHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(dto: UpdatePriceListEntryDTO): Promise<string> {
    const list = await this.repo.findById(dto.priceListId);
    if (!list) throw new Error(`PriceList not found: ${dto.priceListId}`);

    const newEntry = PriceListEntry.create({
      id: dto.newEntry.id,
      priceListId: dto.priceListId,
      productId: dto.newEntry.productId,
      unitPrice: dto.newEntry.unitPrice,
      currency: Currency.of(dto.newEntry.currency),
      discount: makeDiscount(dto.newEntry.discountKind),
      discountPercent: dto.newEntry.discountPercent ?? null,
      discountFixedAmount: dto.newEntry.discountFixedAmount ?? null,
      overridePrice: dto.newEntry.overridePrice ?? null,
      minQuantity: dto.newEntry.minQuantity ?? 1,
      effectiveFrom: new Date(dto.newEntry.effectiveFrom),
      effectiveTo: dto.newEntry.effectiveTo ? new Date(dto.newEntry.effectiveTo) : null,
      createdAt: new Date(),
    });
    list.updateEntry(dto.oldEntryId, newEntry);
    await this.repo.save(list);
    void list.pullDomainEvents();
    return newEntry.getId();
  }
}

export class ArchivePriceListHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(dto: ArchivePriceListDTO): Promise<void> {
    const list = await this.repo.findById(dto.priceListId);
    if (!list) throw new Error(`PriceList not found: ${dto.priceListId}`);
    list.archive();
    await this.repo.save(list);
    void list.pullDomainEvents();
  }
}

export class CalculatePriceHandler {
  constructor(private readonly calc: PricingCalculator) {}
  async execute(dto: CalculatePriceDTO): Promise<PricingDecision | null> {
    const req: PricingRequest = {
      productId: dto.productId,
      quantity: dto.quantity,
      customerId: dto.customerId ?? null,
      customerGroupId: dto.customerGroupId ?? null,
      targetCurrency: dto.targetCurrency,
      asOf: dto.asOf ? new Date(dto.asOf) : new Date(),
    };
    return this.calc.calculate(req);
  }
}

export class GetPriceListHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(priceListId: string): Promise<PriceList | null> {
    return this.repo.findById(priceListId);
  }
}

export class ListPriceListsHandler {
  constructor(private readonly repo: PriceListRepository) {}
  async execute(): Promise<ReadonlyArray<PriceList>> {
    return this.repo.search({});
  }
}

export class SetExchangeRateHandler {
  constructor(private readonly fx: ExchangeRateProvider) {}
  async execute(opts: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    source?: string;
  }): Promise<void> {
    const rate = ExchangeRate.create({
      from: Currency.of(opts.fromCurrency),
      to: Currency.of(opts.toCurrency),
      rate: opts.rate,
      effectiveFrom: new Date(opts.effectiveFrom),
      effectiveTo: opts.effectiveTo ? new Date(opts.effectiveTo) : null,
      source: opts.source ?? 'MANUAL',
    });
    await this.fx.save(rate);
  }
}

function makeScope(dto: CreatePriceListDTO): PriceListScope {
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

function makeDiscount(kind: AddPriceListEntryDTO['discountKind']): DiscountType {
  return DiscountType.fromKind(kind);
}
