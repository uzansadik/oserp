// @oserp-community/inventory — ana giriş (composition + altyapı erişimi)
export {
  createInventoryContainer,
  type InventoryContainer,
  type InventoryContainerConfig,
} from './container';
export { InMemoryEventBus } from './infrastructure/event-store/InMemoryEventBus';
export { OutboxPublisher } from './infrastructure/event-store/OutboxPublisher';
export {
  createInventoryDb,
  db,
  type InventoryDb,
  type InventoryDbClient,
} from './infrastructure/persistance/db';
export { DrizzleUnitOfWork } from './infrastructure/persistance/DrizzleUnitOfWork';
export { InMemoryUnitOfWork } from './infrastructure/persistance/InMemoryUnitOfWork';
export { SystemClock } from './infrastructure/clock/SystemClock';
export { CryptoUuidGenerator } from './infrastructure/crypto/CryptoUuidGenerator';
