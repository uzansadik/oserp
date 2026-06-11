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
import {
  PostReceiptHandler,
  PostIssueHandler,
  PostTransferHandler,
  PostAdjustmentHandler,
  PostScrapHandler,
} from './application/handlers/StockMovementHandlers';
import {
  GetStockLevelHandler,
  GetStockMovementsHandler,
  ListLowStockHandler,
  GetStockValuationHandler,
} from './application/handlers/StockQueryHandlers';
import { StockProjectionServiceImpl } from './application/services/StockProjectionServiceImpl';
import { DefaultReorderEvaluator } from './application/services/DefaultReorderEvaluator';
import type { ClockPort } from './application/ports/ClockPort';
import type { EventBusPort } from './application/ports/EventBusPort';
import type { UuidPort } from './application/ports/UuidPort';
import { SystemClock } from './infrastructure/clock/SystemClock';
import { CryptoUuidGenerator } from './infrastructure/crypto/CryptoUuidGenerator';
import { InMemoryEventBus } from './infrastructure/event-store/InMemoryEventBus';
import { OutboxPublisher } from './infrastructure/event-store/OutboxPublisher';
import { DrizzleUnitOfWork } from './infrastructure/persistance/DrizzleUnitOfWork';
import { DrizzleProductRepository } from './infrastructure/persistance/repositories/DrizzleProductRepository';
import { DrizzleStockMovementRepository } from './infrastructure/persistance/repositories/DrizzleStockMovementRepository';
import { DrizzleInventoryLevelRepository } from './infrastructure/persistance/repositories/DrizzleInventoryLevelRepository';
import type { InventoryDb } from './infrastructure/persistance/db';

export type InventoryContainerConfig = {
  db: InventoryDb;
  overrides?: Partial<{
    clock: ClockPort;
    uuid: UuidPort;
    eventBus: EventBusPort;
  }>;
};

export function createInventoryContainer(config: InventoryContainerConfig) {
  const { db, overrides = {} } = config;

  const clock = overrides.clock ?? new SystemClock();
  const uuid = overrides.uuid ?? new CryptoUuidGenerator();
  const eventBus = overrides.eventBus ?? new InMemoryEventBus();
  const outboxPublisher = new OutboxPublisher(db, eventBus);

  // Repositories (UoW içinde transaction-aware impl'ler kullanılır)
  const uow = new DrizzleUnitOfWork(db);
  const products = new DrizzleProductRepository(db);
  const stockMovements = new DrizzleStockMovementRepository(db);
  const inventoryLevels = new DrizzleInventoryLevelRepository(db);

  // Services
  const projection = new StockProjectionServiceImpl(uow, inventoryLevels);
  const reorderEvaluator = new DefaultReorderEvaluator();

  const commands = {
    // Product
    createProduct: new CreateProductHandler(uow),
    updateProduct: new UpdateProductHandler(uow, clock),
    changeProductType: new ChangeProductTypeHandler(uow),
    discontinueProduct: new DiscontinueProductHandler(uow, clock),
    setReorderPolicy: new SetReorderPolicyHandler(uow, clock),
    addBarcode: new AddBarcodeHandler(uow),
    removeBarcode: new RemoveBarcodeHandler(uow),
    // Stock movements
    postReceipt: new PostReceiptHandler(uow, projection),
    postIssue: new PostIssueHandler(uow, projection),
    postTransfer: new PostTransferHandler(uow, projection),
    postAdjustment: new PostAdjustmentHandler(uow, projection),
    postScrap: new PostScrapHandler(uow, projection),
  } as const;

  const queries = {
    // Product
    getProductById: new GetProductByIdHandler(products),
    getProductBySku: new GetProductBySkuHandler(products),
    listProducts: new ListProductsHandler(products),
    // Stock
    getStockLevel: new GetStockLevelHandler(inventoryLevels),
    getStockMovements: new GetStockMovementsHandler(stockMovements),
    listLowStock: new ListLowStockHandler(inventoryLevels),
    getStockValuation: new GetStockValuationHandler(inventoryLevels),
  } as const;

  return {
    config,
    adapters: { clock, uuid, eventBus, outboxPublisher },
    services: { projection, reorderEvaluator },
    uow,
    repositories: { products, stockMovements, inventoryLevels },
    commands,
    queries,
  };
}

export type InventoryContainer = ReturnType<typeof createInventoryContainer>;
