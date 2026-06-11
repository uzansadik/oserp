import type { FastifyInstance } from 'fastify';
import {
  addBarcodeSchema,
  changeProductTypeSchema,
  createProductSchema,
  discontinueProductSchema,
  removeBarcodeSchema,
  setReorderPolicySchema,
  updateProductSchema,
} from '../../application/commands/ProductCommands';
import {
  getProductByIdSchema,
  getProductBySkuSchema,
  listProductsSchema,
} from '../../application/queries/ProductQueries';
import type { InventoryContainer } from '../../container';
import { mapErrorToHttp } from '../errors/httpErrorMapper';
import { createProductController } from '../controllers/productController';

export async function registerProductRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const controller = createProductController(container);

  app.post('/products', async (request, reply) => {
    const input = createProductSchema.parse(request.body);
    await run(reply, () => controller.create(input));
  });

  app.get('/products', async (request, reply) => {
    const input = listProductsSchema.parse(request.query);
    await run(reply, () => controller.list(input));
  });

  app.get('/products/:productId', async (request, reply) => {
    const { productId } = getProductByIdSchema.parse(request.params);
    await run(reply, () => controller.getById({ productId }));
  });

  app.get('/products/by-sku/:sku', async (request, reply) => {
    const { sku } = getProductBySkuSchema.parse(request.params);
    await run(reply, () => controller.getBySku({ sku }));
  });

  app.patch('/products/:productId', async (request, reply) => {
    const params = request.params as { productId: string };
    const input = updateProductSchema.parse({
      productId: params.productId,
      ...(request.body as object),
    });
    await run(reply, () => controller.update(input));
  });

  app.post('/products/:productId/change-type', async (request, reply) => {
    const params = request.params as { productId: string };
    const input = changeProductTypeSchema.parse({
      productId: params.productId,
      ...(request.body as object),
    });
    await run(reply, () => controller.changeType(input));
  });

  app.post('/products/:productId/discontinue', async (request, reply) => {
    const params = request.params as { productId: string };
    const input = discontinueProductSchema.parse({ productId: params.productId });
    await run(reply, () => controller.discontinue(input));
  });

  app.post('/products/:productId/reorder-policy', async (request, reply) => {
    const params = request.params as { productId: string };
    const input = setReorderPolicySchema.parse({
      productId: params.productId,
      ...(request.body as object),
    });
    await run(reply, () => controller.setReorderPolicy(input));
  });

  app.post('/products/:productId/barcodes', async (request, reply) => {
    const params = request.params as { productId: string };
    const input = addBarcodeSchema.parse({
      productId: params.productId,
      ...(request.body as object),
    });
    await run(reply, () => controller.addBarcode(input));
  });

  app.delete('/products/:productId/barcodes/:code', async (request, reply) => {
    const params = request.params as { productId: string; code: string };
    const input = removeBarcodeSchema.parse({
      productId: params.productId,
      code: params.code,
    });
    await run(reply, () => controller.removeBarcode(input));
  });
}

async function run(
  reply: import('fastify').FastifyReply,
  fn: () => Promise<{ statusCode: number; body: unknown }>,
): Promise<void> {
  try {
    const result = await fn();
    if (result.statusCode === 204) {
      await reply.code(204).send();
    } else {
      await reply.code(result.statusCode).send(result.body);
    }
  } catch (err) {
    const mapped = mapErrorToHttp(err);
    await reply.code(mapped.statusCode).send(mapped.body);
  }
}
