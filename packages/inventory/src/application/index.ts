// @oserp-community/inventory — application giriş noktası
export * from './ports';
export {
  CreateProductHandler,
  UpdateProductHandler,
  ChangeProductTypeHandler,
  DiscontinueProductHandler,
  SetReorderPolicyHandler,
  AddBarcodeHandler,
  RemoveBarcodeHandler,
} from './handlers/ProductHandlers';
export {
  GetProductByIdHandler,
  GetProductBySkuHandler,
  ListProductsHandler,
} from './handlers/ProductQueryHandlers';
export {
  PostReceiptHandler,
  PostIssueHandler,
  PostTransferHandler,
  PostAdjustmentHandler,
  PostScrapHandler,
  type PostResult,
} from './handlers/StockMovementHandlers';
export {
  GetStockLevelHandler,
  GetStockMovementsHandler,
  ListLowStockHandler,
  GetStockValuationHandler,
} from './handlers/StockQueryHandlers';
export { StockProjectionServiceImpl } from './services/StockProjectionServiceImpl';
export { DefaultReorderEvaluator } from './services/DefaultReorderEvaluator';
export type { CommandHandler, QueryHandler } from './Handler';
