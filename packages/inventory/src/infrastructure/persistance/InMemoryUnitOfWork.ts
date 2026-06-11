import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/inventory/application/ports/UnitOfWorkPort';
import { InMemoryInventoryLevelRepository } from './repositories/InMemoryInventoryLevelRepository';
import { InMemoryOutbox } from './InMemoryOutbox';
import { InMemoryProductRepository } from './repositories/InMemoryProductRepository';
import { InMemoryStockMovementRepository } from './repositories/InMemoryStockMovementRepository';

/**
 * In-memory UnitOfWork — transaction semantiği yoktur, repository'leri
 * doğrudan paylaşır. Test'lerde handler'lar bu sayede persist edilmiş hâlde
 * doğrulanabilir.
 */
export class InMemoryUnitOfWork implements UnitOfWorkPort {
  public readonly products: InMemoryProductRepository;
  public readonly stockMovements: InMemoryStockMovementRepository;
  public readonly inventoryLevels: InMemoryInventoryLevelRepository;
  public readonly outbox: InMemoryOutbox;

  constructor() {
    this.products = new InMemoryProductRepository();
    this.stockMovements = new InMemoryStockMovementRepository();
    this.inventoryLevels = new InMemoryInventoryLevelRepository();
    this.outbox = new InMemoryOutbox();
  }

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return work({
      products: this.products,
      stockMovements: this.stockMovements,
      inventoryLevels: this.inventoryLevels,
      outbox: this.outbox,
    });
  }
}
