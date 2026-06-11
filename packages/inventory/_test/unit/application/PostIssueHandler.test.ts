import { PostReceiptHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { PostIssueHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { GetStockLevelHandler } from '@oserp-community/inventory/application/handlers/StockQueryHandlers';
import { StockProjectionServiceImpl } from '@oserp-community/inventory/application/services/StockProjectionServiceImpl';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { CreateProductHandler } from '@oserp-community/inventory/application/handlers/ProductHandlers';

const userId = '22222222-2222-4222-8222-222222222222';

async function seedProductWithStock(qty: string) {
  const uow = new InMemoryUnitOfWork();
  const create = new CreateProductHandler(uow);
  const { productId } = await create.execute({
    sku: 'ISS-001',
    name: 'Issueable',
    type: 'STORABLE',
    procurementPolicy: 'BUY',
  });
  const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
  const receipt = new PostReceiptHandler(uow, projection);
  await receipt.execute({
    lines: [{ productId, quantity: qty, toLocationId: 'WH-A' }],
    documentRef: { type: 'PURCHASE_ORDER', documentId: 'PO-1' },
    postedBy: userId,
  });
  return { uow, productId };
}

describe('PostIssueHandler', () => {
  it('yeterli stok → çıkış başarılı', async () => {
    const { uow, productId } = await seedProductWithStock('100');
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const issue = new PostIssueHandler(uow, projection);

    await issue.execute({
      lines: [{ productId, quantity: '30', fromLocationId: 'WH-A' }],
      documentRef: { type: 'SALES_ORDER', documentId: 'SO-1' },
      postedBy: userId,
    });

    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('70');
  });

  it('yetersiz stok → hata', async () => {
    const { uow, productId } = await seedProductWithStock('10');
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const issue = new PostIssueHandler(uow, projection);

    await expect(
      issue.execute({
        lines: [{ productId, quantity: '50', fromLocationId: 'WH-A' }],
        documentRef: { type: 'SALES_ORDER', documentId: 'SO-2' },
        postedBy: userId,
      }),
    ).rejects.toThrow(/Insufficient/);
  });
});
