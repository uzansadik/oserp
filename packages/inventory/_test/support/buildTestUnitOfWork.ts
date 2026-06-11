import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';

/** Her test için taze InMemoryUnitOfWork döner. */
export function buildTestUnitOfWork(): InMemoryUnitOfWork {
  return new InMemoryUnitOfWork();
}
