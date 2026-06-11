import type {
  AddBarcodeCommand,
  ChangeProductTypeCommand,
  CreateProductCommand,
  DiscontinueProductCommand,
  RemoveBarcodeCommand,
  SetReorderPolicyCommand,
  UpdateProductCommand,
} from '../../application/commands/ProductCommands';
import type {
  GetProductByIdQuery,
  GetProductBySkuQuery,
  ListProductsQuery,
} from '../../application/queries/ProductQueries';
import type { Product } from '../../domain/entities/Product';
import type { InventoryContainer } from '../../container';

export type ControllerResult = {
  statusCode: number;
  body: unknown;
};

/** Bir aggregate'in public alanlarını JSON'a serialize eder. */
function productToJson(p: Product): Record<string, unknown> {
  return {
    id: p.getId().toString(),
    sku: p.getSku().getValue(),
    name: p.getName(),
    description: p.getDescription(),
    type: p.getType().getValue(),
    procurementPolicy: p.getProcurementPolicy().getValue(),
    trackingType: p.getTrackingType().getValue(),
    baseUom: p.getBaseUom().toString(),
    categoryId: p.getCategoryId(),
    status: p.getStatus().getValue(),
    reorderPolicy: p.getReorderPolicy().toJSON(),
    barcodes: p.getBarcodes().map((b) => ({
      code: b.getCode(),
      symbology: b.getSymbology(),
      isPrimary: b.isPrimaryBarcode(),
    })),
    version: p.getVersion(),
    createdAt: p.getCreatedAt(),
    updatedAt: p.getUpdatedAt(),
  };
}

export function createProductController(container: InventoryContainer) {
  return {
    async create(input: CreateProductCommand): Promise<ControllerResult> {
      const result = await container.commands.createProduct.execute(input);
      return { statusCode: 201, body: { productId: result.productId } };
    },

    async update(input: UpdateProductCommand): Promise<ControllerResult> {
      await container.commands.updateProduct.execute(input);
      return { statusCode: 204, body: null };
    },

    async changeType(input: ChangeProductTypeCommand): Promise<ControllerResult> {
      await container.commands.changeProductType.execute(input);
      return { statusCode: 204, body: null };
    },

    async discontinue(input: DiscontinueProductCommand): Promise<ControllerResult> {
      await container.commands.discontinueProduct.execute(input);
      return { statusCode: 204, body: null };
    },

    async setReorderPolicy(input: SetReorderPolicyCommand): Promise<ControllerResult> {
      await container.commands.setReorderPolicy.execute(input);
      return { statusCode: 204, body: null };
    },

    async addBarcode(input: AddBarcodeCommand): Promise<ControllerResult> {
      await container.commands.addBarcode.execute(input);
      return { statusCode: 204, body: null };
    },

    async removeBarcode(input: RemoveBarcodeCommand): Promise<ControllerResult> {
      await container.commands.removeBarcode.execute(input);
      return { statusCode: 204, body: null };
    },

    async getById(input: GetProductByIdQuery): Promise<ControllerResult> {
      const p = await container.queries.getProductById.execute(input);
      return { statusCode: 200, body: productToJson(p) };
    },

    async getBySku(input: GetProductBySkuQuery): Promise<ControllerResult> {
      const p = await container.queries.getProductBySku.execute(input);
      return { statusCode: 200, body: productToJson(p) };
    },

    async list(input: ListProductsQuery): Promise<ControllerResult> {
      const result = await container.queries.listProducts.execute(input);
      return {
        statusCode: 200,
        body: {
          products: result.products.map(productToJson),
          total: result.total,
        },
      };
    },
  };
}
