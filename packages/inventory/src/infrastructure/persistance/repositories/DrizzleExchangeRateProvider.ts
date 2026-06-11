/**
 * Drizzle ExchangeRateProvider — FX rate lookup backed by Postgres.
 */
import { eq, and, lte, or, gt, isNull, desc } from 'drizzle-orm';
import type { InventoryDb } from '../db';
import { exchangeRates } from '../schemas/inv.price-list.schema';
import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { ExchangeRate } from '@oserp-community/inventory/domain/value-objects/ExchangeRate';
import type { ExchangeRateProvider } from '@oserp-community/inventory/application/ports/ExchangeRateProviderPort';

export class DrizzleExchangeRateProvider implements ExchangeRateProvider {
  constructor(private readonly db: InventoryDb) {}

  async save(rate: ExchangeRate): Promise<void> {
    await this.db.insert(exchangeRates).values({
      id: `fx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fromCurrency: rate.getFrom().getCode(),
      toCurrency: rate.getTo().getCode(),
      rate: rate.getRate().toString(),
      effectiveFrom: rate.getEffectiveFrom(),
      effectiveTo: rate.getEffectiveTo(),
      source: rate.getSource(),
      createdAt: new Date(),
    });
  }

  async findDirectRate(from: Currency, to: Currency, at: Date): Promise<ExchangeRate | null> {
    const rows = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from.getCode()),
          eq(exchangeRates.toCurrency, to.getCode()),
          lte(exchangeRates.effectiveFrom, at),
          or(isNull(exchangeRates.effectiveTo), gt(exchangeRates.effectiveTo, at)),
        ),
      )
      .orderBy(desc(exchangeRates.effectiveFrom))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0]!;
    return ExchangeRate.create({
      from: Currency.of(row.fromCurrency),
      to: Currency.of(row.toCurrency),
      rate: Number(row.rate),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      source: row.source,
    });
  }

  async listActiveAt(at: Date): Promise<ReadonlyArray<ExchangeRate>> {
    const rows = await this.db
      .select()
      .from(exchangeRates)
      .where(
        and(
          lte(exchangeRates.effectiveFrom, at),
          or(isNull(exchangeRates.effectiveTo), gt(exchangeRates.effectiveTo, at)),
        ),
      );
    return rows.map((r) =>
      ExchangeRate.create({
        from: Currency.of(r.fromCurrency),
        to: Currency.of(r.toCurrency),
        rate: Number(r.rate),
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        source: r.source,
      }),
    );
  }
}
