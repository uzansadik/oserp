// @oserp-community/iam — ana giriş (composition + altyapı erişimi)

export {
  createIamContainer,
  type IamContainer,
  type IamContainerConfig,
} from './container';
export { InMemoryEventBus } from './infrastructure/event-store/InMemoryEventBus';
export { OutboxPublisher } from './infrastructure/event-store/OutboxPublisher';
export { createIamDb, db, type IamDb, type IamDbClient } from './infrastructure/persistance/db';
export { DrizzleUnitOfWork } from './infrastructure/persistance/DrizzleUnitOfWork';
