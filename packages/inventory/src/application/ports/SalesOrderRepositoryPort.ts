/**
 * Port: SalesOrderRepository
 */
import { SalesOrder } from '../../domain/aggregates/SalesOrder';
import { SalesOrderId } from '../../domain/value-objects/SalesOrderId';

export interface SalesOrderSearchCriteria {
  customerId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface SalesOrderRepository {
  save(order: SalesOrder): Promise<void>;
  findById(id: SalesOrderId): Promise<SalesOrder | null>;
  findByOrderNumber(orderNumber: string): Promise<SalesOrder | null>;
  search(criteria: SalesOrderSearchCriteria): Promise<ReadonlyArray<SalesOrder>>;
  nextOrderNumber(): Promise<string>;
}
