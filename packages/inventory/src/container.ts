import {
  CreateProductHandler,
  UpdateProductHandler,
  ChangeProductTypeHandler,
  DiscontinueProductHandler,
  SetReorderPolicyHandler,
  AddBarcodeHandler,
  RemoveBarcodeHandler,
} from './application/handlers/ProductHandlers';
import {
  GetProductByIdHandler,
  GetProductBySkuHandler,
  ListProductsHandler,
} from './application/handlers/ProductQueryHandlers';
import type { ClockPort } from './application/ports/ClockPort';
import type { EventBusPort } from './application/ports/EventBusPort';
import type { UuidPort } from './application/ports/UuidPort';
import { SystemClock } from './infrastructure/clock/SystemClock';
import { CryptoUuidGenerator } from './infrastructure/crypto/CryptoUuidGenerator';
import { InMemoryEventBus } from './infrastructure/event-store/InMemoryEventBus';
import { OutboxPublisher } from './infrastructure/event-store/OutboxPublisher';
import { DrizzleUnitOfWork } from './infrastructure/persistance/DrizzleUnitOfWork';
import { DrizzleProductRepository } from './infrastructure/persistance/repositories/DrizzleProductRepository';
import type { InventoryDb } from './infrastructure/persistance/db';

export type InventoryContainerConfig = {
  /** Drizzle veritabanı bağlantısı. */
  db: InventoryDb;
  /** İsteğe bağlı port override'ları (test/özelleştirme için). */
  overrides?: Partial<{
    clock: ClockPort;
    uuid: UuidPort;
    eventBus: EventBusPort;
  }>;
};

/**
 * Inventory bağlamının composition root'u. Port'ları somut adapter'lara bağlar
 * ve tüm command/query handler'larını hazır nesneler olarak sunar. `apps/api`
 * ve interface katmanı bu nesneyi tüketir.
 */
export function createInventoryContainer(config: InventoryContainerConfig) {
  const { db, overrides = {} } = config;

  // --- Altyapı adapter'ları (port -> adapter) ---
  const clock = overrides.clock ?? new SystemClock();
  const uuid = overrides.uuid ?? new CryptoUuidGenerator();
  const eventBus = overrides.eventBus ?? new InMemoryEventBus();
  const outboxPublisher = new OutboxPublisher(db, eventBus);

  // --- Unit of Work (yazma yolu) ---
  const uow = new DrizzleUnitOfWork(db);

  // --- Salt-okuma repository'leri (query yolu) ---
  const products = new DrizzleProductRepository(db);

  // --- Command handler'lar ---
  const commands = {
    createProduct: new CreateProductHandler(uow),
    updateProduct: new UpdateProductHandler(uow, clock),
    changeProductType: new ChangeProductTypeHandler(uow),
    discontinueProduct: new DiscontinueProductHandler(uow, clock),
    setReorderPolicy: new SetReorderPolicyHandler(uow, clock),
    addBarcode: new AddBarcodeHandler(uow),
    removeBarcode: new RemoveBarcodeHandler(uow),
  } as const;

  // --- Query handler'lar ---
  const queries = {
    getProductById: new GetProductByIdHandler(products),
    getProductBySku: new GetProductBySkuHandler(products),
    listProducts: new ListProductsHandler(products),
  } as const;

  return {
    config,
    adapters: {
      clock,
      uuid,
      eventBus,
      outboxPublisher,
    },
    uow,
    repositories: { products },
    commands,
    queries,
  };
}

export type InventoryContainer = ReturnType<typeof createInventoryContainer>;
