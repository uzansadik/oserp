import { PostReceiptHandler } from '@oserp-community/inventory/application/handlers/StockMovementHandlers';
import { GetStockLevelHandler } from '@oserp-community/inventory/application/handlers/StockQueryHandlers';
import { StockProjectionServiceImpl } from '@oserp-community/inventory/application/services/StockProjectionServiceImpl';
import { InMemoryUnitOfWork } from '@oserp-community/inventory/infrastructure/persistance/InMemoryUnitOfWork';
import { CreateProductHandler } from '@oserp-community/inventory/application/handlers/ProductHandlers';

const userId = '22222222-2222-4222-8222-222222222222';

async function setupProductAndUoW() {
  const uow = new InMemoryUnitOfWork();
  const create = new CreateProductHandler(uow);
  const { productId } = await create.execute({
    sku: 'STK-001',
    name: 'Stoklu',
    type: 'STORABLE',
    procurementPolicy: 'BUY',
  });
  return { uow, productId };
}

describe('PostReceiptHandler + StockProjection', () => {
  it('mal kabul → InventoryLevel oluşur ve onHand artar', async () => {
    const { uow, productId } = await setupProductAndUoW();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const handler = new PostReceiptHandler(uow, projection);

    const result = await handler.execute({
      lines: [
        {
          productId,
          quantity: '100',
          toLocationId: 'WH-A',
        },
      ],
      documentRef: { type: 'PURCHASE_ORDER', documentId: 'PO-001' },
      postedBy: userId,
    });
    expect(result.movementId).toMatch(/^[0-9a-f-]{36}$/i);

    // Projection sonrası level oluşmalı
    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('100');
  });

  it('ardışık receipt → onHand toplanır', async () => {
    const { uow, productId } = await setupProductAndUoW();
    const projection = new StockProjectionServiceImpl(uow, uow.inventoryLevels);
    const handler = new PostReceiptHandler(uow, projection);

    await handler.execute({
      lines: [{ productId, quantity: '50', toLocationId: 'WH-A' }],
      documentRef: { type: 'PURCHASE_ORDER', documentId: 'PO-001' },
      postedBy: userId,
    });
    await handler.execute({
      lines: [{ productId, quantity: '30', toLocationId: 'WH-A' }],
      documentRef: { type: 'PURCHASE_ORDER', documentId: 'PO-002' },
      postedBy: userId,
    });

    const getLevel = new GetStockLevelHandler(uow.inventoryLevels);
    const level = await getLevel.execute({ productId, locationId: 'WH-A' });
    expect(level.onHand).toBe('80');
  });
});
