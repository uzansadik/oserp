import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class StockAdjustedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.StockAdjusted;

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
