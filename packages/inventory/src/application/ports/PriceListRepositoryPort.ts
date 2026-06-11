/**
 * Port: PriceListRepository
 *
 * Aggregate-level persistence for PriceList. Returns the aggregate (not
 * just a row) so that domain invariants stay in the AR layer.
 */
import { PriceList } from '../../domain/aggregates/PriceList';
import { PriceListScope } from '../../domain/value-objects/PriceListScope';

export interface PriceListSearchCriteria {
  scopeKind?: 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP';
  scopeTargetId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isActiveAt?: Date;
  limit?: number;
  offset?: number;
}

export interface PriceListRepository {
  save(list: PriceList): Promise<void>;
  findById(id: string): Promise<PriceList | null>;
  findByCode(code: string): Promise<PriceList | null>;
  findApplicable(scope: PriceListScope, at: Date): Promise<ReadonlyArray<PriceList>>;
  search(criteria: PriceListSearchCriteria): Promise<ReadonlyArray<PriceList>>;
  delete(id: string): Promise<void>;
}
