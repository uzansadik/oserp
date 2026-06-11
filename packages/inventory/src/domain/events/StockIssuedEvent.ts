import { DomainEvent } from './DomainEvent';
import { InventoryEventNames } from './EventNames';

export class StockIssuedEvent extends DomainEvent {
  readonly eventName = InventoryEventNames.StockIssued;

  constructor(
    public readonly movementId: string,
    public readonly productId: string,
    public readonly locationId: string,
    public readonly quantity: string,
    public readonly lotId: string | null,
    public readonly documentId: string | null,
    occurredOn?: Date,
  ) {
    super(movementId, occurredOn);
  }
}
