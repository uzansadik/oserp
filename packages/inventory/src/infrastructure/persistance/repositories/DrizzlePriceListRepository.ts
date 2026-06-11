/**
 * Drizzle PriceList repository.
 *
 * Maps the aggregate (PriceList + entries) to two tables:
 *   - inv_price_lists
 *   - inv_price_list_entries
 *
 * Save is full-replace (delete + insert entries) — MVP scope. Production:
 * diff and update only changed entries.
 */
import { eq, and, isNull, or, lte, gt, desc } from 'drizzle-orm';
import type { InventoryDb } from '../db';
import { priceLists, priceListEntries } from '../schemas/inv.price-list.schema';
import { PriceList, type PriceListProps } from '@oserp-community/inventory/domain/aggregates/PriceList';
import { PriceListEntry } from '@oserp-community/inventory/domain/entities/PriceListEntry';
import { Currency } from '@oserp-community/inventory/domain/value-objects/Currency';
import { PriceListScope } from '@oserp-community/inventory/domain/value-objects/PriceListScope';
import { DiscountType } from '@oserp-community/inventory/domain/value-objects/DiscountType';
import type {
  PriceListRepository,
  PriceListSearchCriteria,
} from '@oserp-community/inventory/application/ports/PriceListRepositoryPort';

export class DrizzlePriceListRepository implements PriceListRepository {
  constructor(private readonly db: InventoryDb) {}

  async save(list: PriceList): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(priceLists)
        .where(eq(priceLists.id, list.getId()))
        .limit(1);
      if (existing.length > 0) {
        await tx
          .update(priceLists)
          .set({
            code: list.getCode(),
            name: list.getName(),
            description: list.getDescription(),
            scopeKind: list.getScope().getKind(),
            scopeTargetId: list.getScope().getTargetId(),
            baseCurrency: list.getBaseCurrency().getCode(),
            status: list.getStatus(),
            version: list.getVersion(),
            activeFrom: list.getActiveFrom(),
            activeTo: list.getActiveTo(),
            updatedAt: list.getUpdatedAt(),
            archivedAt: list.getArchivedAt(),
          })
          .where(eq(priceLists.id, list.getId()));
      } else {
        await tx.insert(priceLists).values({
          id: list.getId(),
          code: list.getCode(),
          name: list.getName(),
          description: list.getDescription(),
          scopeKind: list.getScope().getKind(),
          scopeTargetId: list.getScope().getTargetId(),
          baseCurrency: list.getBaseCurrency().getCode(),
          status: list.getStatus(),
          version: list.getVersion(),
          activeFrom: list.getActiveFrom(),
          activeTo: list.getActiveTo(),
          createdAt: list.getCreatedAt(),
          updatedAt: list.getUpdatedAt(),
          archivedAt: list.getArchivedAt(),
        });
      }
      // Replace entries
      await tx.delete(priceListEntries).where(eq(priceListEntries.priceListId, list.getId()));
      for (const e of list.getEntries()) {
        await tx.insert(priceListEntries).values({
          id: e.getId(),
          priceListId: e.getPriceListId(),
          productId: e.getProductId(),
          unitPrice: e.getUnitPrice().toString(),
          currency: e.getCurrency().getCode(),
          discountKind: e.getDiscount().getKind(),
          discountPercent: e.getDiscountPercent()?.toString() ?? null,
          discountFixedAmount: e.getDiscountFixedAmount()?.toString() ?? null,
          overridePrice: e.getOverridePrice()?.toString() ?? null,
          minQuantity: e.getMinQuantity(),
          effectiveFrom: e.getEffectiveFrom(),
          effectiveTo: e.getEffectiveTo(),
          createdAt: e.getCreatedAt(),
        });
      }
    });
  }

  async findById(id: string): Promise<PriceList | null> {
    const rows = await this.db
      .select()
      .from(priceLists)
      .where(eq(priceLists.id, id))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0]!;
    const entryRows = await this.db
      .select()
      .from(priceListEntries)
      .where(eq(priceListEntries.priceListId, id));
    const entries = entryRows.map((er) =>
      PriceListEntry.create({
        id: er.id,
        priceListId: er.priceListId,
        productId: er.productId,
        unitPrice: Number(er.unitPrice),
        currency: Currency.of(er.currency),
        discount: DiscountType.fromKind(er.discountKind as 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE'),
        discountPercent: er.discountPercent ? Number(er.discountPercent) : null,
        discountFixedAmount: er.discountFixedAmount ? Number(er.discountFixedAmount) : null,
        overridePrice: er.overridePrice ? Number(er.overridePrice) : null,
        minQuantity: er.minQuantity,
        effectiveFrom: er.effectiveFrom,
        effectiveTo: er.effectiveTo,
        createdAt: er.createdAt,
      }),
    );
    const props: PriceListProps = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      scope: PriceListScope.fromPersistence(
        row.scopeKind as 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP',
        row.scopeTargetId,
      ),
      baseCurrency: Currency.of(row.baseCurrency),
      status: row.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
      version: row.version,
      activeFrom: row.activeFrom,
      activeTo: row.activeTo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt,
      entries,
    };
    return PriceList.rehydrate(props);
  }

  async findByCode(code: string): Promise<PriceList | null> {
    const rows = await this.db
      .select()
      .from(priceLists)
      .where(eq(priceLists.code, code.toUpperCase()))
      .limit(1);
    if (rows.length === 0) return null;
    return this.findById(rows[0]!.id);
  }

  async findApplicable(scope: PriceListScope, at: Date): Promise<ReadonlyArray<PriceList>> {
    const rows = await this.db
      .select()
      .from(priceLists)
      .where(
        and(
          eq(priceLists.scopeKind, scope.getKind()),
          scope.getTargetId()
            ? eq(priceLists.scopeTargetId, scope.getTargetId() as string)
            : isNull(priceLists.scopeTargetId),
          eq(priceLists.status, 'ACTIVE'),
          lte(priceLists.activeFrom, at),
          or(isNull(priceLists.activeTo), gt(priceLists.activeTo, at)),
        ),
      )
      .orderBy(desc(priceLists.version));
    const out: PriceList[] = [];
    for (const row of rows) {
      const list = await this.findById(row.id);
      if (list) out.push(list);
    }
    return out;
  }

  async search(criteria: PriceListSearchCriteria): Promise<ReadonlyArray<PriceList>> {
    const conds = [];
    if (criteria.scopeKind) conds.push(eq(priceLists.scopeKind, criteria.scopeKind));
    if (criteria.scopeTargetId) conds.push(eq(priceLists.scopeTargetId, criteria.scopeTargetId));
    if (criteria.status) conds.push(eq(priceLists.status, criteria.status));
    const rows = await this.db
      .select()
      .from(priceLists)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .limit(criteria.limit ?? 100)
      .offset(criteria.offset ?? 0);
    const out: PriceList[] = [];
    for (const row of rows) {
      const list = await this.findById(row.id);
      if (list) out.push(list);
    }
    return out;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(priceLists).where(eq(priceLists.id, id));
  }
}
