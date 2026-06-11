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
export type { CommandHandler, QueryHandler } from './Handler';
