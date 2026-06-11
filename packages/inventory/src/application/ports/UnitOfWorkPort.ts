import type { OutboxPort } from './OutboxPort';
import type { ProductRepositoryPort } from './ProductRepositoryPort';
import type { StockMovementRepositoryPort } from './StockMovementRepositoryPort';
import type { InventoryLevelRepositoryPort } from './InventoryLevelRepositoryPort';
import type { ReservationRepository } from './ReservationRepositoryPort';
import type { TransferRepository } from './TransferRepositoryPort';

/**
 * Tek bir transaction kapsamında erişilen repository'ler ve outbox.
 * Handler'lar bu bağlam üzerinden çalışır; aggregate kaydı ile event'lerin
 * outbox'a yazılması atomik olur.
 */
export interface UnitOfWorkContext {
  readonly products: ProductRepositoryPort;
  readonly stockMovements: StockMovementRepositoryPort;
  readonly inventoryLevels: InventoryLevelRepositoryPort;
  readonly reservations: ReservationRepository;
  readonly transfers: TransferRepository;
  readonly outbox: OutboxPort;
}

export interface UnitOfWorkPort {
  execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}
