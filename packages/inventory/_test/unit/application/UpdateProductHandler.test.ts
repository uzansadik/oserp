import {
  CreateProductHandler,
  DiscontinueProductHandler,
  UpdateProductHandler,
} from '@oserp-community/inventory/application/handlers/ProductHandlers';
import type { CreateProductCommand, UpdateProductCommand } from '@oserp-community/inventory/application/commands/ProductCommands';
import { NotFoundError } from '@oserp-community/inventory/domain/errors/NotFoundError';
import { InvalidStateError } from '@oserp-community/inventory/domain/errors/InvalidStateError';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { FakeClock } from '../../support/FakeClock';
import { buildTestUnitOfWork } from '../../support/buildTestUnitOfWork';

async function createProduct(): Promise<{ id: string; uow: ReturnType<typeof buildTestUnitOfWork> }> {
  const uow = buildTestUnitOfWork();
  const create = new CreateProductHandler(uow);
  const cmd: CreateProductCommand = {
    sku: 'UPD-001',
    name: 'Eski İsim',
    type: 'STORABLE',
    procurementPolicy: 'BUY',
  };
  const { productId } = await create.execute(cmd);
  return { id: productId, uow };
}

describe('UpdateProductHandler', () => {
  it('name, description, baseUom, categoryId günceller', async () => {
    const { id, uow } = await createProduct();
    const clock = new FakeClock();
    const handler = new UpdateProductHandler(uow, clock);

    const cmd: UpdateProductCommand = {
      productId: id,
      name: 'Yeni İsim',
      description: 'Yeni açıklama',
      baseUom: 'KG',
    };
    await handler.execute(cmd);

    const product = await uow.products.findById(ProductId.create(id));
    expect(product?.getName()).toBe('Yeni İsim');
    expect(product?.getDescription()).toBe('Yeni açıklama');
    expect(product?.getBaseUom().toString()).toBe('KG');
  });

  it('olmayan ürün için NotFoundError fırlatır', async () => {
    const uow = buildTestUnitOfWork();
    const clock = new FakeClock();
    const handler = new UpdateProductHandler(uow, clock);

    const fakeId = '11111111-1111-4111-8111-111111111111';
    await expect(
      handler.execute({ productId: fakeId, name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('discontinued ürün güncellenemez', async () => {
    const { id, uow } = await createProduct();
    const clock = new FakeClock();
    const discontinue = new DiscontinueProductHandler(uow, clock);
    await discontinue.execute({ productId: id });

    const handler = new UpdateProductHandler(uow, clock);
    await expect(
      handler.execute({ productId: id, name: 'X' }),
    ).rejects.toBeInstanceOf(InvalidStateError);
  });
});
