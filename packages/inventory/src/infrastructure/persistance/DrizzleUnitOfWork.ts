import type {
  UnitOfWorkContext,
  UnitOfWorkPort,
} from '@oserp-community/inventory/application/ports/UnitOfWorkPort';
import { DrizzleOutbox } from './DrizzleOutbox';
import type { InventoryDb, InventoryDbClient } from './db';
import { DrizzleProductRepository } from './repositories/DrizzleProductRepository';

function buildContext(client: InventoryDbClient): UnitOfWorkContext {
  return {
    products: new DrizzleProductRepository(client),
    outbox: new DrizzleOutbox(client),
  };
}

/**
 * Tüm aggregate kayıtlarını ve outbox yazımlarını tek bir veritabanı
 * transaction'ında çalıştıran UnitOfWork. `work` başarıyla dönerse commit,
 * hata fırlatırsa rollback yapılır.
 */
export class DrizzleUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly db: InventoryDb) {}

  async execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      return work(buildContext(tx));
    });
  }
}
