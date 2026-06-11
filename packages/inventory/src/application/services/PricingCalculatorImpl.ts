/**
 * Service: PricingCalculatorImpl
 *
 * Implements the port by:
 *   - Looking up applicable PriceLists via the repository
 *   - Picking the best entry per list
 *   - Selecting the winning list by scope precedence + version
 *   - Applying discount
 *   - Converting currency if needed
 *   - Building a PricingDecision with a full trace
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

interface Candidate {
  list: PriceList;
  entry: PriceListEntry;
  scopePrecedence: number;
}

export class PricingCalculatorImpl implements PricingCalculator {
  constructor(
    private readonly priceLists: PriceListRepository,
    private readonly fxProvider: ExchangeRateProvider,
  ) {}

  async calculate(request: PricingRequest): Promise<PricingDecision | null> {
    const targetCurrency = Currency.tryOf(request.targetCurrency);
    if (!targetCurrency) {
      throw new Error(`Invalid target currency: ${request.targetCurrency}`);
    }

    const candidates = await this.collectCandidates(request);
    if (candidates.length === 0) {
      return null;
    }

    // Sort: highest scope precedence first, then newest version
    const sorted = [...candidates].sort((a, b) => {
      if (a.scopePrecedence !== b.scopePrecedence) {
        return b.scopePrecedence - a.scopePrecedence;
      }
      return b.list.getVersion() - a.list.getVersion();
    });

    const winner = sorted[0];
    if (!winner) {
      return null;
    }
    return this.buildDecision(winner, request, targetCurrency);
  }

  private async collectCandidates(request: PricingRequest): Promise<ReadonlyArray<Candidate>> {
    const out: Candidate[] = [];

    // CUSTOMER scope
    if (request.customerId) {
      const customerScope = PriceListScope.customer(request.customerId);
      const lists = await this.priceLists.findApplicable(customerScope, request.asOf);
      for (const list of lists) {
        const entry = list.findActiveEntryAt(request.productId, request.asOf, request.quantity);
        if (entry) out.push({ list, entry, scopePrecedence: 2 });
      }
    }

    // CUSTOMER_GROUP scope
    if (request.customerGroupId) {
      const groupScope = PriceListScope.customerGroup(request.customerGroupId);
      const lists = await this.priceLists.findApplicable(groupScope, request.asOf);
      for (const list of lists) {
        const entry = list.findActiveEntryAt(request.productId, request.asOf, request.quantity);
        if (entry) out.push({ list, entry, scopePrecedence: 1 });
      }
    }

    // GLOBAL scope
    const globalScope = PriceListScope.global();
    const globalLists = await this.priceLists.findApplicable(globalScope, request.asOf);
    for (const list of globalLists) {
      const entry = list.findActiveEntryAt(request.productId, request.asOf, request.quantity);
      if (entry) out.push({ list, entry, scopePrecedence: 0 });
    }

    return out;
  }

  private async buildDecision(
    winner: Candidate,
    request: PricingRequest,
    targetCurrency: Currency,
  ): Promise<PricingDecision> {
    const trace: { step: number; description: string }[] = [];
    trace.push({
      step: 1,
      description: `Found ${winner.list.getCode()} (${winner.list.getScope().toString()}) v${winner.list.getVersion()}`,
    });

    const entry = winner.entry;
    const listPrice = entry.getUnitPrice();
    const entryCurrency = entry.getCurrency();
    trace.push({
      step: 2,
      description: `List price: ${listPrice} ${entryCurrency.getCode()} (entry ${entry.getId()})`,
    });

    // Apply discount on the entry's currency
    const discountResult = entry.getDiscount().apply(listPrice, {
      percent: entry.getDiscountPercent() ?? undefined,
      fixedAmount: entry.getDiscountFixedAmount() ?? undefined,
      overridePrice: entry.getOverridePrice() ?? undefined,
    });
    trace.push({
      step: 3,
      description: `Discount ${discountResult.kind}: ${listPrice} -> ${discountResult.finalUnitPrice} ${entryCurrency.getCode()}`,
    });

    let finalPrice = discountResult.finalUnitPrice;
    let finalCurrency = entryCurrency;
    if (!targetCurrency.equals(entryCurrency)) {
      const rate = await this.findCrossRate(entryCurrency, targetCurrency, request.asOf);
      if (!rate) {
        throw new Error(`No FX rate ${entryCurrency}->${targetCurrency} at ${request.asOf.toISOString()}`);
      }
      finalPrice = rate.convert(finalPrice);
      trace.push({
        step: 4,
        description: `FX ${entryCurrency}->${targetCurrency} = ${rate.getRate()} -> ${finalPrice} ${targetCurrency.getCode()}`,
      });
      finalCurrency = targetCurrency;
    }

    trace.push({
      step: trace.length + 1,
      description: `Final: ${finalPrice} ${finalCurrency.getCode()} x ${request.quantity} = ${finalPrice * request.quantity}`,
    });

    return PricingDecision.create({
      productId: request.productId,
      quantity: request.quantity,
      unitPrice: finalPrice,
      currency: finalCurrency,
      listPrice,
      appliedDiscount: DiscountType.fromKind(discountResult.kind),
      discountAmount: discountResult.discountApplied,
      appliedPriceListId: winner.list.getId(),
      appliedPriceListCode: winner.list.getCode(),
      appliedEntryId: entry.getId(),
      trace,
    });
  }

  private async findCrossRate(
    from: Currency,
    to: Currency,
    at: Date,
  ): Promise<ExchangeRate | null> {
    if (from.equals(to)) {
      return ExchangeRate.identity(from, at);
    }
    const direct = await this.fxProvider.findDirectRate(from, to, at);
    if (direct) return direct;
    // Try inverse
    const inverse = await this.fxProvider.findDirectRate(to, from, at);
    if (inverse) {
      return ExchangeRate.create({
        from,
        to,
        rate: 1 / inverse.getRate(),
        effectiveFrom: inverse.getEffectiveFrom(),
        effectiveTo: inverse.getEffectiveTo(),
        source: `${inverse.getSource()}_INVERSE`,
      });
    }
    return null;
  }
}
