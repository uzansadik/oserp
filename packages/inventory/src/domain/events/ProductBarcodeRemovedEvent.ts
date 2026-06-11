import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ProductBarcodeRemovedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ProductBarcodeRemoved;

  constructor(
    public readonly productId: string,
    public readonly barcode: string,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
