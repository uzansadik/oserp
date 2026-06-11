import { StockMovement } from '@oserp-community/inventory/domain/entities/StockMovement';
import { MovementTypeVO } from '@oserp-community/inventory/domain/value-objects/MovementType';
import { MovementLine } from '@oserp-community/inventory/domain/entities/MovementLine';
import { ProductId } from '@oserp-community/inventory/domain/value-objects/ProductId';
import { LocationRef } from '@oserp-community/inventory/domain/value-objects/LocationRef';
import { DocumentRef, DocumentType } from '@oserp-community/inventory/domain/value-objects/DocumentRef';
import { ReasonCode } from '@oserp-community/inventory/domain/value-objects/ReasonCode';
import { StockReceivedEvent } from '@oserp-community/inventory/domain/events/StockReceivedEvent';
import { StockIssuedEvent } from '@oserp-community/inventory/domain/events/StockIssuedEvent';
import { StockAdjustedEvent } from '@oserp-community/inventory/domain/events/StockAdjustedEvent';
import { StockScrappedEvent } from '@oserp-community/inventory/domain/events/StockScrappedEvent';
import { StockTransferredEvent } from '@oserp-community/inventory/domain/events/StockTransferredEvent';

const productId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

function makeLine(qty: string) {
  return MovementLine.create({
    productId: ProductId.create(productId),
    quantity: qty,
    uom: 'UNT',
    fromLocation: LocationRef.create('WH-A'),
    toLocation: LocationRef.create('WH-B'),
  });
}

describe('StockMovement', () => {
  describe('create', () => {
    it('en az bir satır gerekir', () => {
      expect(() =>
        StockMovement.create({
          type: MovementTypeVO.receipt(),
          documentRef: DocumentRef.none(),
          lines: [],
          postedBy: userId,
        }),
      ).toThrow(/at least one line/);
    });

    it('ADJUSTMENT reason code olmadan oluşturulamaz', () => {
      expect(() =>
        StockMovement.create({
          type: MovementTypeVO.adjustment(),
          documentRef: DocumentRef.none(),
          lines: [makeLine('10')],
          postedBy: userId,
        }),
      ).toThrow(/requires a reason code/);
    });

    it('RECEIPT → StockReceivedEvent üretir', () => {
      const m = StockMovement.create({
        type: MovementTypeVO.receipt(),
        documentRef: DocumentRef.create(DocumentType.MANUAL, 'PO-001'),
        lines: [makeLine('100')],
        postedBy: userId,
      });
      const events = m.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(StockReceivedEvent);
      const e = events[0] as StockReceivedEvent;
      expect(e.productId).toBe(productId);
      expect(e.quantity).toBe('100');
      expect(e.locationId).toBe('WH-B'); // toLocation
    });

    it('ISSUE → StockIssuedEvent üretir', () => {
      const m = StockMovement.create({
        type: MovementTypeVO.issue(),
        documentRef: DocumentRef.create(DocumentType.SALES_ORDER, 'SO-100'),
        lines: [makeLine('50')],
        postedBy: userId,
      });
      const events = m.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(StockIssuedEvent);
      const e = events[0] as StockIssuedEvent;
      expect(e.locationId).toBe('WH-A'); // fromLocation
    });

    it('ADJUSTMENT + reason code → StockAdjustedEvent üretir', () => {
      const m = StockMovement.create({
        type: MovementTypeVO.adjustment(),
        documentRef: DocumentRef.create(DocumentType.ADJUSTMENT),
        lines: [makeLine('5')],  // miktar pozitif; sign service tarafından yorumlanır
        reasonCode: ReasonCode.create('COUNT_DIFF'),
        postedBy: userId,
      });
      const events = m.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(StockAdjustedEvent);
    });

    it('SCRAP + reason code → StockScrappedEvent üretir', () => {
      const m = StockMovement.create({
        type: MovementTypeVO.scrap(),
        documentRef: DocumentRef.none(),
        lines: [makeLine('2')],
        reasonCode: ReasonCode.create('DAMAGED'),
        postedBy: userId,
      });
      const events = m.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(StockScrappedEvent);
    });

    it('TRANSFER → StockTransferredEvent (from + to)', () => {
      const m = StockMovement.create({
        type: MovementTypeVO.transfer(),
        documentRef: DocumentRef.none(),
        lines: [makeLine('30')],
        postedBy: userId,
      });
      const events = m.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(StockTransferredEvent);
      const e = events[0] as StockTransferredEvent;
      expect(e.fromLocationId).toBe('WH-A');
      expect(e.toLocationId).toBe('WH-B');
    });

    it('birden fazla satır → her satır için ayrı event', () => {
      const l1 = makeLine('10');
      const l2 = MovementLine.create({
        productId: ProductId.create('33333333-3333-4333-8333-333333333333'),
        quantity: '20',
        uom: 'KG',
        fromLocation: LocationRef.create('WH-A'),
        toLocation: LocationRef.create('WH-B'),
      });
      const m = StockMovement.create({
        type: MovementTypeVO.receipt(),
        documentRef: DocumentRef.none(),
        lines: [l1, l2],
        postedBy: userId,
      });
      expect(m.pullDomainEvents()).toHaveLength(2);
    });
  });
});
