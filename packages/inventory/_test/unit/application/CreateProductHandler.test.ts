import { CreateProductHandler } from '@oserp-community/inventory/application/handlers/ProductHandlers';
import type { CreateProductCommand } from '@oserp-community/inventory/application/commands/ProductCommands';
import { ProductCreatedEvent } from '@oserp-community/inventory/domain/events/ProductCreatedEvent';
import { ConflictError } from '@oserp-community/inventory/domain/errors/ConflictError';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { buildTestUnitOfWork } from '../../support/buildTestUnitOfWork';

describe('CreateProductHandler', () => {
  it('yeni ürün oluşturur, kaydeder ve outbox\'a event yazar', async () => {
    const uow = buildTestUnitOfWork();
    const handler = new CreateProductHandler(uow);

    const cmd: CreateProductCommand = {
      sku: 'TEST-001',
      name: 'Test Ürünü',
      description: 'Açıklama',
      type: 'STORABLE',
      procurementPolicy: 'BUY',
      trackingType: 'NONE',
      baseUom: 'UNT',
    };

    const result = await handler.execute(cmd);
    expect(result.productId).toMatch(/^[0-9a-f-]{36}$/i);

    // Ürün kaydedildi mi?
    const product = await uow.products.findById(ProductId.create(result.productId));
    expect(product).not.toBeNull();
    expect(product?.getSku().getValue()).toBe('TEST-001');

    // Outbox'ta event var mı?
    expect(uow.outbox.events).toHaveLength(1);
    expect(uow.outbox.events[0]).toBeInstanceOf(ProductCreatedEvent);
  });

  it('aynı SKU ile ikinci kez oluşturulamaz (ConflictError)', async () => {
    const uow = buildTestUnitOfWork();
    const handler = new CreateProductHandler(uow);

    const cmd: CreateProductCommand = {
      sku: 'DUP-001',
      name: 'İlk',
      type: 'STORABLE',
      procurementPolicy: 'BUY',
    };
    await handler.execute(cmd);

    await expect(
      handler.execute({ ...cmd, name: 'İkinci' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
