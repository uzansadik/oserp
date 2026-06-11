import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/inventory/application/ports/UnitOfWorkPort';
import { InMemoryOutbox } from './InMemoryOutbox';
import { InMemoryProductRepository } from './repositories/InMemoryProductRepository';

/**
 * In-memory UnitOfWork — transaction semantiği yoktur, repository'leri
 * doğrudan paylaşır. Test'lerde handler'lar bu sayede persist edilmiş hâlde
 * doğrulanabilir.
 */
export class InMemoryUnitOfWork implements UnitOfWorkPort {
  public readonly products: InMemoryProductRepository;
  public readonly outbox: InMemoryOutbox;

  constructor() {
    this.products = new InMemoryProductRepository();
    this.outbox = new InMemoryOutbox();
  }

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return work({
      products: this.products,
      outbox: this.outbox,
    });
  }
}
