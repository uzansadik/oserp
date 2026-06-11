import type { Product } from '../../domain/entities/Product';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { ProductId } from '../../domain/value-objects/ProductId';
import { Sku } from '../../domain/value-objects/Sku';
import {
  getProductByIdSchema,
  getProductBySkuSchema,
  listProductsSchema,
  type ListProductsQuery,
} from '../queries/ProductQueries';
import type {
  ListProductsFilter,
  ListProductsResult,
  ProductRepositoryPort,
} from '../ports/ProductRepositoryPort';
import type { QueryHandler } from '../Handler';

export class GetProductByIdHandler
  implements QueryHandler<{ productId: string }, Product>
{
  constructor(private readonly repo: ProductRepositoryPort) {}

  async execute(query: { productId: string }): Promise<Product> {
    const q = getProductByIdSchema.parse(query);
    const product = await this.repo.findById(ProductId.create(q.productId));
    if (!product) {
      throw new NotFoundError('Product', q.productId);
    }
    return product;
  }
}

export class GetProductBySkuHandler
  implements QueryHandler<{ sku: string }, Product>
{
  constructor(private readonly repo: ProductRepositoryPort) {}

  async execute(query: { sku: string }): Promise<Product> {
    const q = getProductBySkuSchema.parse(query);
    const product = await this.repo.findBySku(Sku.create(q.sku));
    if (!product) {
      throw new NotFoundError('Product', q.sku);
    }
    return product;
  }
}

export class ListProductsHandler
  implements QueryHandler<ListProductsQuery, ListProductsResult>
{
  constructor(private readonly repo: ProductRepositoryPort) {}

  async execute(query: ListProductsQuery): Promise<ListProductsResult> {
    const q = listProductsSchema.parse(query);
    const filter: ListProductsFilter = {
      limit: q.limit,
      offset: q.offset,
    };
    if (q.sku !== undefined) filter.sku = q.sku;
    if (q.type !== undefined) filter.type = q.type as never;
    if (q.status !== undefined) filter.status = q.status as never;
    if (q.categoryId !== undefined) filter.categoryId = q.categoryId;
    if (q.search !== undefined) filter.search = q.search;
    return this.repo.list(filter);
  }
}
