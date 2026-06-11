import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ProductDiscontinuedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ProductDiscontinued;

  constructor(
    public readonly productId: string,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
