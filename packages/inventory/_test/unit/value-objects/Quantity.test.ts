import { Quantity } from '@oserp-community/inventory/domain/value-objects/Quantity';
import { describe, expect, it } from 'vitest';

describe('Quantity', () => {
  describe('create', () => {
    it('sıfır oluşturur', () => {
      const q = Quantity.zero();
      expect(q.getOnHand()).toBe('0');
      expect(q.getAvailable()).toBe('0');
      expect(q.isZero()).toBe(true);
    });

    it('geçerli değerlerle oluşturur', () => {
      const q = Quantity.create('100', '20', '10');
      expect(q.getOnHand()).toBe('100');
      expect(q.getAvailable()).toBe('70');
    });

    it('onHand < reserved + inTransit → invariant ihlali', () => {
      expect(() => Quantity.create('10', '5', '6')).toThrow(/invariant/);
    });
  });

  describe('addOnHand', () => {
    it('pozitif delta ekler', () => {
      const q = Quantity.create('100').addOnHand('50');
      expect(q.getOnHand()).toBe('150');
    });
  });

  describe('subtractOnHand', () => {
    it('stok yeterliyse çıkarır', () => {
      const q = Quantity.create('100').subtractOnHand('30');
      expect(q.getOnHand()).toBe('70');
    });

    it('stok yetersizse hata fırlatır', () => {
      expect(() => Quantity.create('10').subtractOnHand('20')).toThrow(/Insufficient/);
    });
  });

  describe('markInTransit / receiveInTransit', () => {
    it('markInTransit: onHand azalır, inTransit artar', () => {
      const q = Quantity.create('100').markInTransit('30');
      expect(q.getOnHand()).toBe('70');
      expect(q.getInTransit()).toBe('30');
    });

    it('receiveInTransit: inTransit azalır, onHand artar', () => {
      const q = Quantity.create('70', '0', '30').receiveInTransit('30');
      expect(q.getOnHand()).toBe('100');
      expect(q.getInTransit()).toBe('0');
    });

    it('transfer 2-step sonunda başlangıçtaki ile aynı onHand', () => {
      const start = Quantity.create('100');
      const out = start.markInTransit('40');
      const inT = out.receiveInTransit('40');
      expect(inT.getOnHand()).toBe('100');
      expect(inT.getInTransit()).toBe('0');
    });
  });

  describe('equals', () => {
    it('aynı değerler eşit', () => {
      expect(Quantity.create('100', '10', '5').equals(Quantity.create('100', '10', '5'))).toBe(true);
    });
    it('farklı değerler eşit değil', () => {
      expect(Quantity.create('100').equals(Quantity.create('200'))).toBe(false);
    });
  });
});
