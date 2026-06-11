import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class StockScrappedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.StockScrapped;

  constructor(
    public readonly movementId: string,
    public readonly productId: string,
    public readonly locationId: string,
    public readonly quantity: string,
    public readonly reasonCode: string,
    occurredOn?: Date,
  ) {
    super(movementId, occurredOn);
  }
}
