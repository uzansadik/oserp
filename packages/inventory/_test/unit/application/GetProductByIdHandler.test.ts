import { CreateProductHandler } from '@oserp-community/inventory/application/handlers/ProductHandlers';
import {
  GetProductByIdHandler,
  ListProductsHandler,
} from '@oserp-community/inventory/application/handlers/ProductQueryHandlers';
import { buildTestUnitOfWork } from '../../support/buildTestUnitOfWork';

describe('GetProductByIdHandler', () => {
  it('ürünü ID ile bulur', async () => {
    const uow = buildTestUnitOfWork();
    const create = new CreateProductHandler(uow);
    const { productId } = await create.execute({
      sku: 'GID-001',
      name: 'Bulunacak',
      type: 'STORABLE',
      procurementPolicy: 'BUY',
    });

    const handler = new GetProductByIdHandler(uow.products);
    const p = await handler.execute({ productId });
    expect(p.getId().toString()).toBe(productId);
  });

  it('olmayan ID için NotFoundError fırlatır', async () => {
    const uow = buildTestUnitOfWork();
    const handler = new GetProductByIdHandler(uow.products);
    await expect(
      handler.execute({ productId: '22222222-2222-4222-8222-222222222222' }),
    ).rejects.toThrow(/Product not found/);
  });
});

describe('ListProductsHandler', () => {
  it('boş listede 0 döner', async () => {
    const uow = buildTestUnitOfWork();
    const handler = new ListProductsHandler(uow.products);
    const result = await handler.execute({});
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('oluşturulan ürünleri listeler', async () => {
    const uow = buildTestUnitOfWork();
    const create = new CreateProductHandler(uow);
    await create.execute({ sku: 'LST-001', name: 'A', type: 'STORABLE', procurementPolicy: 'BUY' });
    await create.execute({ sku: 'LST-002', name: 'B', type: 'SERVICE', procurementPolicy: 'NONE' });

    const handler = new ListProductsHandler(uow.products);
    const result = await handler.execute({});
    expect(result.products).toHaveLength(2);
    expect(result.total).toBe(2);
  });
});
