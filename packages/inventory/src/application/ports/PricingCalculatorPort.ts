/**
 * Port: PricingCalculator
 *
 * Service that given a productId, quantity, customerId, customerGroupId,
 * desiredCurrency, and asOf date, picks the best price across all
 * applicable PriceLists and returns a PricingDecision.
 *
 * Strategy:
 *   1. Resolve all candidate PriceLists matching scope (CUSTOMER + matching
 *      group + GLOBAL)
 *   2. From each, find the active entry for product/quantity at asOf
 *   3. Sort by scope precedence (CUSTOMER > GROUP > GLOBAL), then by version
 *      (newest wins)
 *   4. Apply discount from the chosen entry
 *   5. If target currency differs from entry currency, convert via FX
 *   6. Return PricingDecision with trace
 */
import { PricingDecision } from '../../domain/value-objects/PricingDecision';

export interface PricingRequest {
  productId: string;
  quantity: number;
  customerId: string | null;
  customerGroupId: string | null;
  targetCurrency: string; // 3-letter code
  asOf: Date;
}

export interface PricingCalculator {
  calculate(request: PricingRequest): Promise<PricingDecision | null>;
}
