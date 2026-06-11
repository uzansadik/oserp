import { StockMovement } from '../../domain/entities/StockMovement';
import { MovementLine } from '../../domain/entities/MovementLine';
import { ProductId } from '../../domain/value-objects/ProductId';
import { LotRef } from '../../domain/value-objects/LotRef';
import { LocationRef } from '../../domain/value-objects/LocationRef';
import { DocumentRef } from '../../domain/value-objects/DocumentRef';
import { ReasonCode } from '../../domain/value-objects/ReasonCode';
import { MovementTypeVO } from '../../domain/value-objects/MovementType';
import type { StockProjectionService } from '../ports/StockProjectionServicePort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';
import type { CommandHandler } from '../Handler';
import type {
  PostAdjustmentCommand,
  PostIssueCommand,
  PostReceiptCommand,
  PostScrapCommand,
  PostTransferCommand,
} from '../commands/StockMovementCommands';

export type PostResult = { movementId: string };

function toMovementLine(l: {
  productId: string; quantity: string; uom?: string | undefined;
  lotId?: string | null | undefined; fromLocationId?: string | null | undefined; toLocationId?: string | null | undefined;
  unitCost?: string | null | undefined;
}): MovementLine {
  return MovementLine.create({
    productId: ProductId.create(l.productId),
    quantity: l.quantity,
    uom: l.uom ?? 'UNT',
    lotRef: l.lotId ? LotRef.create(l.lotId) : null,
    fromLocation: l.fromLocationId ? LocationRef.create(l.fromLocationId) : null,
    toLocation: l.toLocationId ? LocationRef.create(l.toLocationId) : null,
    unitCost: l.unitCost ?? null,
  });
}

function toDocumentRef(ref?: { type?: string; documentId?: string | null | undefined }): DocumentRef {
  if (!ref) return DocumentRef.none();
  return DocumentRef.create(ref.type ?? 'MANUAL', ref.documentId ?? null);
}

abstract class BasePostHandler<TCommand> {
  constructor(
    protected readonly uow: UnitOfWorkPort,
    protected readonly projection: StockProjectionService,
  ) {}

  protected async persistOutboxAndProject(movement: StockMovement): Promise<void> {
    const events = movement.pullDomainEvents();
    await this.uow.execute(async (ctx) => {
      await ctx.stockMovements.save(movement);
      await ctx.outbox.enqueue(events);
    });
    await this.projection.applyEvents(events);
  }

  abstract execute(cmd: TCommand): Promise<PostResult>;
}

export class PostReceiptHandler
  extends BasePostHandler<PostReceiptCommand>
  implements CommandHandler<PostReceiptCommand, PostResult>
{
  async execute(cmd: PostReceiptCommand): Promise<PostResult> {
    const movement = StockMovement.create({
      type: MovementTypeVO.receipt(),
      documentRef: toDocumentRef(cmd.documentRef),
      lines: cmd.lines.map(toMovementLine),
      postedBy: cmd.postedBy,
      ...(cmd.postedAt !== undefined ? { postedAt: new Date(cmd.postedAt) } : {}),
    });
    await this.persistOutboxAndProject(movement);
    return { movementId: movement.getId().toString() };
  }
}

export class PostIssueHandler
  extends BasePostHandler<PostIssueCommand>
  implements CommandHandler<PostIssueCommand, PostResult>
{
  async execute(cmd: PostIssueCommand): Promise<PostResult> {
    const movement = StockMovement.create({
      type: MovementTypeVO.issue(),
      documentRef: toDocumentRef(cmd.documentRef),
      lines: cmd.lines.map(toMovementLine),
      postedBy: cmd.postedBy,
      ...(cmd.postedAt !== undefined ? { postedAt: new Date(cmd.postedAt) } : {}),
    });
    await this.persistOutboxAndProject(movement);
    return { movementId: movement.getId().toString() };
  }
}

export class PostTransferHandler
  extends BasePostHandler<PostTransferCommand>
  implements CommandHandler<PostTransferCommand, PostResult>
{
  async execute(cmd: PostTransferCommand): Promise<PostResult> {
    const movement = StockMovement.create({
      type: MovementTypeVO.transfer(),
      documentRef: DocumentRef.none(),
      lines: cmd.lines.map(toMovementLine),
      postedBy: cmd.postedBy,
      ...(cmd.postedAt !== undefined ? { postedAt: new Date(cmd.postedAt) } : {}),
    });
    await this.persistOutboxAndProject(movement);
    return { movementId: movement.getId().toString() };
  }
}

export class PostAdjustmentHandler
  extends BasePostHandler<PostAdjustmentCommand>
  implements CommandHandler<PostAdjustmentCommand, PostResult>
{
  async execute(cmd: PostAdjustmentCommand): Promise<PostResult> {
    // Quantity sign taşır ('+5', '-3'); AR'a olduğu gibi iletir.
    // StockProjectionServiceImpl sign'i kendi yorumlar.
    const movement = StockMovement.create({
      type: MovementTypeVO.adjustment(),
      documentRef: toDocumentRef(cmd.documentRef),
      lines: cmd.lines.map(toMovementLine),
      ...(cmd.reasonCode !== undefined ? { reasonCode: ReasonCode.create(cmd.reasonCode) } : {}),
      postedBy: cmd.postedBy,
      ...(cmd.postedAt !== undefined ? { postedAt: new Date(cmd.postedAt) } : {}),
    });
    await this.persistOutboxAndProject(movement);
    return { movementId: movement.getId().toString() };
  }
}

export class PostScrapHandler
  extends BasePostHandler<PostScrapCommand>
  implements CommandHandler<PostScrapCommand, PostResult>
{
  async execute(cmd: PostScrapCommand): Promise<PostResult> {
    const movement = StockMovement.create({
      type: MovementTypeVO.scrap(),
      documentRef: toDocumentRef(cmd.documentRef),
      lines: cmd.lines.map(toMovementLine),
      ...(cmd.reasonCode !== undefined ? { reasonCode: ReasonCode.create(cmd.reasonCode) } : {}),
      postedBy: cmd.postedBy,
      ...(cmd.postedAt !== undefined ? { postedAt: new Date(cmd.postedAt) } : {}),
    });
    await this.persistOutboxAndProject(movement);
    return { movementId: movement.getId().toString() };
  }
}
