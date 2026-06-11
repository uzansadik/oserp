import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ProductTypeChangedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ProductTypeChanged;

  constructor(
    public readonly productId: string,
    public readonly oldType: string,
    public readonly newType: string,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
