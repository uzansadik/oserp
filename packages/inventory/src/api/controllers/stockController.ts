import type {
  PostAdjustmentCommand,
  PostIssueCommand,
  PostReceiptCommand,
  PostScrapCommand,
  PostTransferCommand,
} from '../../application/commands/StockMovementCommands';
import type {
  GetStockLevelQuery,
  GetStockMovementsQuery,
  GetStockValuationQuery,
  ListLowStockQuery,
} from '../../application/queries/StockQueries';
import type { StockMovement } from '../../domain/entities/StockMovement';
import type { InventoryContainer } from '../../container';
import type { ControllerResult } from './productController';

function movementToJson(m: StockMovement): Record<string, unknown> {
  return {
    id: m.getId().toString(),
    type: m.getType().getValue(),
    direction: m.getDirection().getValue(),
    documentRef: {
      type: m.getDocumentRef().getType(),
      documentId: m.getDocumentRef().getDocumentId(),
    },
    lines: m.getLines().map((l) => ({
      productId: l.getProductId().toString(),
      quantity: l.getQuantity(),
      uom: l.getUom(),
      lotId: l.getLotRef()?.getLotId() ?? null,
      fromLocationId: l.getFromLocation()?.getLocationId() ?? null,
      toLocationId: l.getToLocation()?.getLocationId() ?? null,
      unitCost: l.getUnitCost(),
    })),
    reasonCode: m.getReasonCode()?.getValue() ?? null,
    postedBy: m.getPostedBy(),
    postedAt: m.getPostedAt(),
  };
}

export function createStockController(container: InventoryContainer) {
  return {
    async postReceipt(input: PostReceiptCommand): Promise<ControllerResult> {
      const result = await container.commands.postReceipt.execute(input);
      return { statusCode: 201, body: result };
    },
    async postIssue(input: PostIssueCommand): Promise<ControllerResult> {
      const result = await container.commands.postIssue.execute(input);
      return { statusCode: 201, body: result };
    },
    async postTransfer(input: PostTransferCommand): Promise<ControllerResult> {
      const result = await container.commands.postTransfer.execute(input);
      return { statusCode: 201, body: result };
    },
    async postAdjustment(input: PostAdjustmentCommand): Promise<ControllerResult> {
      const result = await container.commands.postAdjustment.execute(input);
      return { statusCode: 201, body: result };
    },
    async postScrap(input: PostScrapCommand): Promise<ControllerResult> {
      const result = await container.commands.postScrap.execute(input);
      return { statusCode: 201, body: result };
    },

    async getStockMovements(input: GetStockMovementsQuery): Promise<ControllerResult> {
      const result = await container.queries.getStockMovements.execute(input);
      return {
        statusCode: 200,
        body: { movements: result.movements.map(movementToJson), total: result.total },
      };
    },

    async getStockLevel(input: GetStockLevelQuery): Promise<ControllerResult> {
      const result = await container.queries.getStockLevel.execute({
        productId: input.productId,
        locationId: input.locationId,
        lotId: input.lotId ?? null,
      });
      return { statusCode: 200, body: result };
    },

    async listLowStock(input: ListLowStockQuery): Promise<ControllerResult> {
      const result = await container.queries.listLowStock.execute(input);
      return {
        statusCode: 200,
        body: { levels: result.levels, total: result.total },
      };
    },

    async getStockValuation(input: GetStockValuationQuery): Promise<ControllerResult> {
      const result = await container.queries.getStockValuation.execute(input);
      return { statusCode: 200, body: result };
    },
  };
}
