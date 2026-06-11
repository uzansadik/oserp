/**
 * Service: SalesOrderService
 *
 * Provides pricing integration: when adding a line, call PricingCalculator
 * to resolve the unit price from PriceLists (if not provided explicitly).
 */
import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { PricingCalculator } from '@oserp-community/inventory/application/ports/PricingCalculatorPort';

export interface PricingContext {
  productId: string;
  quantity: number;
  customerId: string | null;
  customerGroupId: string | null;
  currency: string;
}

export class SalesOrderPricingService {
  constructor(private readonly pricing: PricingCalculator) {}

  /**
   * Resolve a unit price for a line using the price list system.
   * Throws if no applicable price is found.
   */
  async resolveUnitPrice(ctx: PricingContext, asOf: Date = new Date()): Promise<Money> {
    const decision = await this.pricing.calculate({
      productId: ctx.productId,
      quantity: ctx.quantity,
      customerId: ctx.customerId,
      customerGroupId: ctx.customerGroupId,
      targetCurrency: ctx.currency,
      asOf,
    });
    if (!decision) {
      throw new Error(`No applicable price for product ${ctx.productId} in ${ctx.currency}`);
    }
    return Money.of(decision.getUnitPrice(), decision.getCurrency().getCode());
  }

  /**
   * Quick FX check: throw if order currency differs from a reference currency.
   */
  ensureCurrency(currencyCode: string, expected: string): void {
    if (currencyCode !== expected) {
      throw new Error(`Currency mismatch: ${currencyCode} vs expected ${expected}`);
    }
    Currency.of(currencyCode);
  }
}
