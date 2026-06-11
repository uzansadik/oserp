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
import { DrizzlePriceListRepository } from './infrastructure/persistance/repositories/DrizzlePriceListRepository';
import { DrizzleExchangeRateProvider } from './infrastructure/persistance/repositories/DrizzleExchangeRateProvider';
import { DrizzleLotRepository } from './infrastructure/persistance/repositories/DrizzleLotRepository';
import { DrizzleSalesOrderRepository } from './infrastructure/persistance/repositories/DrizzleSalesOrderRepository';
import { DrizzleInvoiceRepository } from './infrastructure/persistance/repositories/DrizzleInvoiceRepository';
import { DrizzleReservationRepository } from './infrastructure/persistance/repositories/DrizzleReservationRepository';
import {
  CreatePriceListHandler,
  AddEntryHandler,
  UpdateEntryHandler,
  ArchivePriceListHandler,
  ActivatePriceListHandler,
  GetPriceListHandler,
  ListPriceListsHandler,
  CalculatePriceHandler,
  SetExchangeRateHandler,
} from './application/handlers/PriceListHandlers';
import {
  CreateLotHandler,
  DispatchLotsHandler,
  ExpireLotsHandler,
  QuarantineLotHandler,
  AllocateSerialsHandler,
  GetLotAggregateHandler,
  ListLotsHandler,
} from './application/handlers/LotHandlers';
import { FefoDispatchStrategy } from './application/services/FefoDispatchStrategy';
import { LotExpiryService } from './application/services/LotExpiryService';
import { SalesOrderPricingService } from './application/services/SalesOrderPricingService';
import { PricingCalculatorImpl } from './application/services/PricingCalculatorImpl';
import {
  CreateOrderHandler,
  AddOrderLineHandler,
  RemoveOrderLineHandler,
  ConfirmOrderHandler,
  FulfillOrderHandler,
  CancelOrderHandler,
  GetOrderHandler,
  ListOrdersHandler,
  CreateInvoiceFromOrderHandler,
  IssueInvoiceHandler,
  RecordPaymentHandler,
  VoidInvoiceHandler,
  CloseInvoiceHandler,
  GetInvoiceHandler,
  ListInvoicesHandler,
} from './application/handlers/SalesOrderHandlers';
import {
  CreateReservationHandler,
  ReleaseReservationHandler,
  CommitReservationHandler,
  GetReservationHandler,
  ListReservationsHandler,
} from './application/handlers/ReservationHandlers';
import { ReservationService } from './application/services/ReservationService';
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
  const priceLists = new DrizzlePriceListRepository(db);
  const exchangeRateProvider = new DrizzleExchangeRateProvider(db);
  const lotRepo = new DrizzleLotRepository(db);
  const orderRepo = new DrizzleSalesOrderRepository(db);
  const invoiceRepo = new DrizzleInvoiceRepository(db);
  const reservationRepo = new DrizzleReservationRepository(db);

  // Services
  const projection = new StockProjectionServiceImpl(uow, inventoryLevels);
  const reorderEvaluator = new DefaultReorderEvaluator();
  const pricingCalculator = new PricingCalculatorImpl(priceLists, exchangeRateProvider);
  const fefoStrategy = new FefoDispatchStrategy();
  const lotExpiryService = new LotExpiryService(lotRepo);
  const orderPricing = new SalesOrderPricingService(pricingCalculator);
  const reservationService = new ReservationService(
    uow,
    reservationRepo,
    lotRepo,
    inventoryLevels,
    fefoStrategy,
    clock,
  );

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
    // PriceList + FX
    createPriceList: new CreatePriceListHandler(priceLists),
    activatePriceList: new ActivatePriceListHandler(priceLists),
    addEntry: new AddEntryHandler(priceLists),
    updateEntry: new UpdateEntryHandler(priceLists),
    archivePriceList: new ArchivePriceListHandler(priceLists),
    setExchangeRate: new SetExchangeRateHandler(exchangeRateProvider),
    // Lots
    createLot: new CreateLotHandler(lotRepo),
    dispatchLots: new DispatchLotsHandler(lotRepo, fefoStrategy),
    expireLots: new ExpireLotsHandler(lotRepo),
    quarantineLot: new QuarantineLotHandler(lotRepo),
    allocateSerials: new AllocateSerialsHandler(lotRepo),
    // Sales
    createOrder: new CreateOrderHandler(orderRepo),
    addOrderLine: new AddOrderLineHandler(orderRepo, orderPricing),
    removeOrderLine: new RemoveOrderLineHandler(orderRepo),
    confirmOrder: new ConfirmOrderHandler(orderRepo, reservationService),
    fulfillOrder: new FulfillOrderHandler(orderRepo),
    cancelOrder: new CancelOrderHandler(orderRepo, reservationService, reservationRepo),
    // Invoices
    createInvoiceFromOrder: new CreateInvoiceFromOrderHandler(orderRepo, invoiceRepo),
    issueInvoice: new IssueInvoiceHandler(invoiceRepo),
    recordPayment: new RecordPaymentHandler(invoiceRepo, reservationService, reservationRepo),
    voidInvoice: new VoidInvoiceHandler(invoiceRepo),
    closeInvoice: new CloseInvoiceHandler(invoiceRepo),
    // Reservations (Faz 6)
    createReservation: new CreateReservationHandler(reservationService),
    releaseReservation: new ReleaseReservationHandler(reservationService),
    commitReservation: new CommitReservationHandler(reservationService),
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
    // PriceList + FX
    getPriceList: new GetPriceListHandler(priceLists),
    listPriceLists: new ListPriceListsHandler(priceLists),
    calculatePrice: new CalculatePriceHandler(pricingCalculator),
    // Lots
    getLotAggregate: new GetLotAggregateHandler(lotRepo),
    listLots: new ListLotsHandler(lotRepo),
    // Sales + Invoices
    getOrder: new GetOrderHandler(orderRepo),
    listOrders: new ListOrdersHandler(orderRepo),
    getInvoice: new GetInvoiceHandler(invoiceRepo),
    listInvoices: new ListInvoicesHandler(invoiceRepo),
    // Reservations (Faz 6)
    getReservation: new GetReservationHandler(reservationRepo),
    listReservations: new ListReservationsHandler(reservationRepo),
  } as const;

  return {
    config,
    adapters: { clock, uuid, eventBus, outboxPublisher },
    services: { projection, reorderEvaluator, pricingCalculator, fefoStrategy, lotExpiryService, orderPricing, reservationService },
    uow,
    repositories: { products, stockMovements, inventoryLevels, priceLists, exchangeRateProvider, lotRepo, orderRepo, invoiceRepo, reservationRepo },
    commands,
    queries,
  };
}

export type InventoryContainer = ReturnType<typeof createInventoryContainer>;
