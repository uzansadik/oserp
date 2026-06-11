import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ProductBarcodeAddedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ProductBarcodeAdded;

  constructor(
    public readonly productId: string,
    public readonly barcode: string,
    public readonly symbology: string,
    public readonly isPrimary: boolean,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
