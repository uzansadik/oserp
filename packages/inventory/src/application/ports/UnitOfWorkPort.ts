import type { OutboxPort } from './OutboxPort';
import type { ProductRepositoryPort } from './ProductRepositoryPort';

/**
 * Tek bir transaction kapsamında erişilen repository'ler ve outbox.
 * Handler'lar bu bağlam üzerinden çalışır; aggregate kaydı ile event'lerin
 * outbox'a yazılması atomik olur.
 */
export interface UnitOfWorkContext {
  readonly products: ProductRepositoryPort;
  readonly outbox: OutboxPort;
}

export interface UnitOfWorkPort {
  execute<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}
