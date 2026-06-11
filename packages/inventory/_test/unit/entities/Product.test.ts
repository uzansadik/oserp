import { Product } from '@oserp-community/inventory/domain/entities/Product';
import { InvalidStateError } from '@oserp-community/inventory/domain/errors/InvalidStateError';
import { ValidationError } from '@oserp-community/inventory/domain/errors/ValidationError';
import type { DomainEvent } from '@oserp-community/inventory/domain/events/DomainEvent';
import { ProductBarcodeAddedEvent } from '@oserp-community/inventory/domain/events/ProductBarcodeAddedEvent';
import { ProductCreatedEvent } from '@oserp-community/inventory/domain/events/ProductCreatedEvent';
import { ProductDiscontinuedEvent } from '@oserp-community/inventory/domain/events/ProductDiscontinuedEvent';
import { ProductTypeChangedEvent } from '@oserp-community/inventory/domain/events/ProductTypeChangedEvent';
import { ReorderPolicyChangedEvent } from '@oserp-community/inventory/domain/events/ReorderPolicyChangedEvent';
import { Barcode } from '@oserp-community/inventory/domain/value-objects/Barcode';
import { ProcurementPolicyVO } from '@oserp-community/inventory/domain/value-objects/ProcurementPolicy';
import { ProductTypeVO } from '@oserp-community/inventory/domain/value-objects/ProductType';
import { ReorderPolicy } from '@oserp-community/inventory/domain/value-objects/ReorderPolicy';
import { TrackingTypeVO } from '@oserp-community/inventory/domain/value-objects/TrackingType';
import { Uom } from '@oserp-community/inventory/domain/value-objects/Uom';
import { describe, expect, it } from 'vitest';

const isEvent = <T extends DomainEvent>(e: DomainEvent, c: new (...args: never[]) => T): boolean =>
  e instanceof c;

describe('Product', () => {
  const validSku = 'TEST-001';
  const validName = 'Test Ürünü';

  const baseProps = () => ({
    sku: validSku,
    name: validName,
    type: ProductTypeVO.storable(),
    procurementPolicy: ProcurementPolicyVO.buy(),
  });

  describe('create', () => {
    it('geçerli props ile Product oluşturur ve ProductCreatedEvent ekler', () => {
      const product = Product.create(baseProps());

      expect(product.getSku().getValue()).toBe('TEST-001');
      expect(product.getName()).toBe('Test Ürünü');
      expect(product.getType().isStorable()).toBe(true);
      expect(product.getProcurementPolicy().isBuy()).toBe(true);
      expect(product.getStatus().isActive()).toBe(true);
      expect(product.getBaseUom().toString()).toBe('UNT');
      expect(product.getTrackingType().isNone()).toBe(true);
      expect(product.getVersion()).toBe(1);

      const events = product.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
    });

    it('SKU küçük harfle verilirse büyütür', () => {
      const product = Product.create({ ...baseProps(), sku: 'test-001' });
      expect(product.getSku().getValue()).toBe('TEST-001');
    });

    it('id verildiğinde onu kullanır', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const product = Product.create({ ...baseProps(), id: { toString: () => id } as never });
      expect(product.getId().toString()).toBe(id);
    });

    it('id verilmediğinde UUID üretir', () => {
      const product = Product.create(baseProps());
      expect(product.getId().toString()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('initialBarcode varsa ekler ve primary yapar', () => {
      const bc = Barcode.create('1234567890123', 'EAN13');
      const product = Product.create({ ...baseProps(), initialBarcode: bc });
      const barcodes = product.getBarcodes();
      expect(barcodes).toHaveLength(1);
      expect(barcodes[0]?.isPrimaryBarcode()).toBe(true);
      expect(product.getDomainEvents().some((e) => isEvent(e, ProductBarcodeAddedEvent))).toBe(true);
    });

    it('boş name hata fırlatır', () => {
      expect(() => Product.create({ ...baseProps(), name: '' })).toThrow(ValidationError);
      expect(() => Product.create({ ...baseProps(), name: '   ' })).toThrow(ValidationError);
    });

    it('çok uzun name hata fırlatır', () => {
      expect(() => Product.create({ ...baseProps(), name: 'a'.repeat(257) })).toThrow(ValidationError);
    });

    it('geçersiz SKU hata fırlatır', () => {
      expect(() => Product.create({ ...baseProps(), sku: 'a' })).toThrow(ValidationError); // 1 char
      expect(() => Product.create({ ...baseProps(), sku: 'has space' })).toThrow(ValidationError);
      expect(() => Product.create({ ...baseProps(), sku: 'TURKISH-ÇĞİ' })).toThrow(ValidationError);
      expect(() => Product.create({ ...baseProps(), sku: 'a'.repeat(65) })).toThrow(ValidationError);
    });
  });

  describe('updateBasicInfo', () => {
    it('name, description, baseUom, categoryId günceller', () => {
      const product = Product.create(baseProps());
      product.updateBasicInfo({
        name: 'Yeni İsim',
        description: 'Yeni açıklama',
        baseUom: Uom.kilogram(),
        categoryId: 'cat-123',
      });
      expect(product.getName()).toBe('Yeni İsim');
      expect(product.getDescription()).toBe('Yeni açıklama');
      expect(product.getBaseUom().toString()).toBe('KG');
      expect(product.getCategoryId()).toBe('cat-123');
    });

    it('boş name reddedilir', () => {
      const product = Product.create(baseProps());
      expect(() => product.updateBasicInfo({ name: '' })).toThrow(ValidationError);
    });
  });

  describe('changeType', () => {
    it('tipi değiştirir ve ProductTypeChangedEvent ekler', () => {
      const product = Product.create(baseProps());
      product.changeType(ProductTypeVO.service());
      expect(product.getType().isService()).toBe(true);
      const events = product.getDomainEvents();
      expect(events.some((e) => isEvent(e, ProductTypeChangedEvent))).toBe(true);
    });

    it('aynı tipe geçişte event üretmez', () => {
      const product = Product.create(baseProps());
      product.changeType(ProductTypeVO.storable());
      expect(product.getDomainEvents().filter((e) => isEvent(e, ProductTypeChangedEvent))).toHaveLength(0);
    });

    it('SERVICE tipe LOT izleme atanamaz (zaten yok)', () => {
      const product = Product.create({ ...baseProps(), type: ProductTypeVO.service() });
      // SERVICE + NONE geçerli
      expect(() => product.changeTrackingType(TrackingTypeVO.lot())).toThrow(ValidationError);
    });
  });

  describe('changeTrackingType', () => {
    it('STORABLE ürüne LOT izleme atanabilir', () => {
      const product = Product.create(baseProps());
      product.changeTrackingType(TrackingTypeVO.lot());
      expect(product.getTrackingType().isLot()).toBe(true);
    });

    it('CONSUMABLE ürüne SERIAL atanamaz', () => {
      const product = Product.create({ ...baseProps(), type: ProductTypeVO.consumable() });
      expect(() => product.changeTrackingType(TrackingTypeVO.serial())).toThrow(ValidationError);
    });
  });

  describe('setReorderPolicy', () => {
    it('yeni policy atar ve ReorderPolicyChangedEvent ekler', () => {
      const product = Product.create(baseProps());
      const policy = ReorderPolicy.create({ minQty: '10', maxQty: '100', reorderQty: '30', safetyStock: '15' });
      product.setReorderPolicy(policy);
      expect(product.getReorderPolicy().getMinQty()).toBe('10');
      expect(product.getDomainEvents().some((e) => isEvent(e, ReorderPolicyChangedEvent))).toBe(true);
    });

    it('aynı policy atandığında event üretmez', () => {
      const product = Product.create(baseProps());
      const policy = ReorderPolicy.create({ minQty: '10', maxQty: '100' });
      product.setReorderPolicy(policy);
      product.setReorderPolicy(policy);
      expect(product.getDomainEvents().filter((e) => isEvent(e, ReorderPolicyChangedEvent))).toHaveLength(1);
    });
  });

  describe('discontinue', () => {
    it('discontinue eder ve ProductDiscontinuedEvent ekler', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      expect(product.getStatus().isDiscontinued()).toBe(true);
      expect(product.getDomainEvents().some((e) => isEvent(e, ProductDiscontinuedEvent))).toBe(true);
    });

    it('iki kez discontinue event üretmez', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      product.discontinue();
      expect(product.getDomainEvents().filter((e) => isEvent(e, ProductDiscontinuedEvent))).toHaveLength(1);
    });
  });

  describe('discontinued invariant', () => {
    it('discontinue sonrası updateBasicInfo hata fırlatır', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      expect(() => product.updateBasicInfo({ name: 'X' })).toThrow(InvalidStateError);
    });

    it('discontinue sonrası addBarcode hata fırlatır', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      const bc = Barcode.create('CODE12345', 'CODE128');
      expect(() => product.addBarcode(bc)).toThrow(InvalidStateError);
    });

    it('discontinue sonrası setReorderPolicy hata fırlatır', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      expect(() => product.setReorderPolicy(ReorderPolicy.none())).toThrow(InvalidStateError);
    });
  });

  describe('activate / deactivate', () => {
    it('deactivate → reactivate geçişi', () => {
      const product = Product.create(baseProps());
      product.deactivate();
      expect(product.getStatus().isInactive()).toBe(true);
      product.activate();
      expect(product.getStatus().isActive()).toBe(true);
    });

    it('discontinue sonrası activate hata fırlatır', () => {
      const product = Product.create(baseProps());
      product.discontinue();
      expect(() => product.activate()).toThrow(InvalidStateError);
    });
  });

  describe('barcodes', () => {
    it('birden fazla barkod eklenebilir; sadece ilki primary', () => {
      const product = Product.create(baseProps());
      product.addBarcode(Barcode.create('CODE00001', 'CODE128'));
      product.addBarcode(Barcode.create('CODE00002', 'CODE128'));
      const barcodes = product.getBarcodes();
      expect(barcodes).toHaveLength(2);
      const primary = barcodes.find((b) => b?.isPrimaryBarcode());
      expect(primary?.getCode()).toBe('CODE00001');
    });

    it('aynı barkod iki kez eklenemez', () => {
      const product = Product.create(baseProps());
      product.addBarcode(Barcode.create('CODE00001', 'CODE128'));
      expect(() => product.addBarcode(Barcode.create('CODE00001', 'CODE128'))).toThrow(ValidationError);
    });

    it('barkod silinebilir', () => {
      const product = Product.create(baseProps());
      product.addBarcode(Barcode.create('CODE00001', 'CODE128'));
      product.addBarcode(Barcode.create('CODE00002', 'CODE128'));
      product.removeBarcode('code00001'); // case-insensitive
      expect(product.getBarcodes()).toHaveLength(1);
    });

    it('olmayan barkodu silmek hata fırlatır', () => {
      const product = Product.create(baseProps());
      expect(() => product.removeBarcode('NOPE')).toThrow(ValidationError);
    });

    it('EAN13 format doğrulaması', () => {
      expect(() => Barcode.create('12345', 'EAN13')).toThrow(ValidationError);
    });
  });

  describe('pullDomainEvents', () => {
    it('eventleri döner ve temizler', () => {
      const product = Product.create(baseProps());
      product.changeType(ProductTypeVO.service());
      product.setReorderPolicy(ReorderPolicy.create({ minQty: '1' }));
      const events = product.pullDomainEvents();
      expect(events.length).toBeGreaterThanOrEqual(3);
      // pull sonrası event listesi temizlenmiş olmalı
      expect(product.getDomainEvents()).toHaveLength(0);
    });
  });
});
