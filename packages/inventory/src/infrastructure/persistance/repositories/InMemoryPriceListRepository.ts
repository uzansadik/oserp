/**
 * In-memory PriceList repository. For tests / dev.
 */
import type { PriceList } from '@oserp-community/inventory/domain/aggregates/PriceList';
import type { PriceListRepository, PriceListSearchCriteria } from '@oserp-community/inventory/application/ports/PriceListRepositoryPort';
import { PriceListScope } from '@oserp-community/inventory/domain/value-objects/PriceListScope';

export class InMemoryPriceListRepository implements PriceListRepository {
  private readonly byId = new Map<string, PriceList>();

  async save(list: PriceList): Promise<void> {
    this.byId.set(list.getId(), list);
  }

  async findById(id: string): Promise<PriceList | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCode(code: string): Promise<PriceList | null> {
    for (const l of this.byId.values()) {
      if (l.getCode() === code.toUpperCase()) return l;
    }
    return null;
  }

  async findApplicable(scope: PriceListScope, at: Date): Promise<ReadonlyArray<PriceList>> {
    const out: PriceList[] = [];
    for (const l of this.byId.values()) {
      if (!l.isActiveAt(at)) continue;
      if (!l.getScope().matchesScope(scope)) continue;
      out.push(l);
    }
    return out;
  }

  async search(criteria: PriceListSearchCriteria): Promise<ReadonlyArray<PriceList>> {
    let arr = Array.from(this.byId.values());
    if (criteria.scopeKind) {
      arr = arr.filter((l) => l.getScope().getKind() === criteria.scopeKind);
    }
    if (criteria.scopeTargetId) {
      arr = arr.filter((l) => l.getScope().getTargetId() === criteria.scopeTargetId);
    }
    if (criteria.status) {
      arr = arr.filter((l) => l.getStatus() === criteria.status);
    }
    if (criteria.isActiveAt) {
      arr = arr.filter((l) => l.isActiveAt(criteria.isActiveAt!));
    }
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? arr.length;
    return arr.slice(offset, offset + limit);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
