import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/inventory/application/ports/UnitOfWorkPort';
import { InMemoryInventoryLevelRepository } from './repositories/InMemoryInventoryLevelRepository';
import { InMemoryOutbox } from './InMemoryOutbox';
import { InMemoryProductRepository } from './repositories/InMemoryProductRepository';
import { InMemoryReservationRepository } from './repositories/InMemoryReservationRepository';
import { InMemoryStockMovementRepository } from './repositories/InMemoryStockMovementRepository';
import { InMemoryTransferRepository } from './repositories/InMemoryTransferRepository';

/**
 * In-memory UnitOfWork — transaction semantiği yoktur, repository'leri
 * doğrudan paylaşır. Test'lerde handler'lar bu sayede persist edilmiş hâlde
 * doğrulanabilir.
 */
export class InMemoryUnitOfWork implements UnitOfWorkPort {
  public readonly products: InMemoryProductRepository;
  public readonly stockMovements: InMemoryStockMovementRepository;
  public readonly inventoryLevels: InMemoryInventoryLevelRepository;
  public readonly reservations: InMemoryReservationRepository;
  public readonly transfers: InMemoryTransferRepository;
  public readonly outbox: InMemoryOutbox;

  constructor() {
    this.products = new InMemoryProductRepository();
    this.stockMovements = new InMemoryStockMovementRepository();
    this.inventoryLevels = new InMemoryInventoryLevelRepository();
    this.reservations = new InMemoryReservationRepository();
    this.transfers = new InMemoryTransferRepository();
    this.outbox = new InMemoryOutbox();
  }

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return work({
      products: this.products,
      stockMovements: this.stockMovements,
      inventoryLevels: this.inventoryLevels,
      reservations: this.reservations,
      transfers: this.transfers,
      outbox: this.outbox,
    });
  }
}
