import { PostReceiptHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { PostScrapHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { PostAdjustmentHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { GetStockLevelHandler } from '@oserp-community/inventory/application/handlers/StockQueryHandlers';
import { StockProjectionServiceImpl } from '@oserp-community/inventory/application/services/StockProjectionServiceImpl';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { CreateProductHandler } from '@oserp-community/inventory/application/handlers/ProductHandlers';

const userId = '22222222-2222-4222-8222-222222222222';

async function seed() {
  const uow = new InMemoryUnitOfWork();
  const create = new CreateProductHandler(uow);
  const { productId } = await create.execute({
    sku: 'ADJ-001',
    name: 'Adjustable',
    type: 'STORABLE',
    procurementPolicy: 'BUY',
  });
  const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
  const receipt = new PostReceiptHandler(uow, projection);
  await receipt.execute({
    lines: [{ productId, quantity: '100', toLocationId: 'WH-A' }],
    documentRef: { type: 'PURCHASE_ORDER', documentId: 'PO' },
    postedBy: userId,
  });
  return { uow, productId };
}

describe('PostAdjustmentHandler', () => {
  it('pozitif adjustment → onHand artar', async () => {
    const { uow, productId } = await seed();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const adj = new PostAdjustmentHandler(uow, projection);

    await adj.execute({
      lines: [{ productId, quantity: '+5', fromLocationId: 'WH-A' }],
      reasonCode: 'COUNT_DIFF',
      documentRef: { type: 'ADJUSTMENT' },
      postedBy: userId,
    });

    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('105');
  });

  it('negatif adjustment → onHand azalır', async () => {
    const { uow, productId } = await seed();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const adj = new PostAdjustmentHandler(uow, projection);

    await adj.execute({
      lines: [{ productId, quantity: '-3', fromLocationId: 'WH-A' }],
      reasonCode: 'COUNT_DIFF',
      documentRef: { type: 'ADJUSTMENT' },
      postedBy: userId,
    });

    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('97');
  });

  it('reason code olmadan oluşturulamaz', async () => {
    const { uow, productId } = await seed();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const adj = new PostAdjustmentHandler(uow, projection);
    // Schema'ya göre reason code zorunlu; handler domain-level enforce eder
    await expect(
      adj.execute({
        lines: [{ productId, quantity: '+5', fromLocationId: 'WH-A' }],
        // @ts-expect-test: zod schema zorunlu tutar, biz burada direkt çağırıyoruz
        reasonCode: undefined as unknown as string,
        documentRef: { type: 'ADJUSTMENT' },
        postedBy: userId,
      }),
    ).rejects.toThrow(/requires a reason code/);
  });
});

describe('PostScrapHandler', () => {
  it('scrap → onHand azalır', async () => {
    const { uow, productId } = await seed();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const scrap = new PostScrapHandler(uow, projection);

    await scrap.execute({
      lines: [{ productId, quantity: '7', fromLocationId: 'WH-A' }],
      reasonCode: 'DAMAGED',
      documentRef: { type: 'ADJUSTMENT' },
      postedBy: userId,
    });

    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('93');
  });
});
