import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class ProductCreatedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.ProductCreated;

  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly type: string,
    occurredOn?: Date,
  ) {
    super(productId, occurredOn);
  }
}
