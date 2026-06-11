/**
 * Handlers: Transfer
 *
 * TransferService'i saran komut ve sorgu handler'ları. Service kendi
 * FEFO + InventoryLevel iş mantığını içerir; bu handler'lar sadece service'i
 * çağırır ve DTO/View'a map eder.
 */
import type { TransferService } from '../services/TransferService';
import type { TransferRepository } from '../ports/TransferRepositoryPort';
import type {
  CreateTransferCommand,
  DispatchTransferCommand,
  ReceiveTransferCommand,
  CancelTransferCommand,
  TransferResult,
} from '../commands/TransferCommands';
import type {
  ListTransfersQuery,
  TransferListResult,
} from '../queries/TransferQueries';
import { transferToView } from '../dto/TransferDTOs';

export class CreateTransferHandler {
  constructor(private readonly service: TransferService) {}
  async execute(cmd: CreateTransferCommand): Promise<TransferResult> {
    return this.service.createTransfer(cmd);
  }
}

export class DispatchTransferHandler {
  constructor(private readonly service: TransferService) {}
  async execute(cmd: DispatchTransferCommand): Promise<TransferResult> {
    return this.service.dispatchTransfer(cmd);
  }
}

export class MarkInTransitHandler {
  constructor(private readonly service: TransferService) {}
  async execute(transferId: string): Promise<TransferResult> {
    return this.service.markInTransit(transferId);
  }
}

export class ReceiveTransferHandler {
  constructor(private readonly service: TransferService) {}
  async execute(cmd: ReceiveTransferCommand): Promise<TransferResult> {
    return this.service.receiveTransfer(cmd);
  }
}

export class CloseTransferHandler {
  constructor(private readonly service: TransferService) {}
  async execute(transferId: string): Promise<TransferResult> {
    return this.service.closeTransfer(transferId);
  }
}

export class CancelTransferHandler {
  constructor(private readonly service: TransferService) {}
  async execute(cmd: CancelTransferCommand): Promise<TransferResult> {
    return this.service.cancelTransfer(cmd);
  }
}

export class GetTransferHandler {
  constructor(private readonly repo: TransferRepository) {}
  async execute(transferId: string): Promise<TransferResult> {
    const { TransferId } = await import('@oserp-community/inventory/domain/value-objects/TransferId');
    const t = await this.repo.findById(TransferId.of(transferId));
    if (!t) return { ok: false, error: `Transfer not found: ${transferId}` };
    return { ok: true, transfer: transferToView(t) };
  }
}

export class ListTransfersHandler {
  constructor(private readonly repo: TransferRepository) {}
  async execute(query: ListTransfersQuery): Promise<TransferListResult> {
    const criteria: Parameters<TransferRepository['search']>[0] = {};
    if (query.sourceLocationId !== undefined) criteria.sourceLocationId = query.sourceLocationId;
    if (query.destinationLocationId !== undefined) criteria.destinationLocationId = query.destinationLocationId;
    if (query.status !== undefined) criteria.status = query.status;
    if (query.productId !== undefined) criteria.productId = query.productId;
    if (query.inFlightOnly !== undefined) criteria.inFlightOnly = query.inFlightOnly;
    if (query.limit !== undefined) criteria.limit = query.limit;
    if (query.offset !== undefined) criteria.offset = query.offset;
    const arr = await this.repo.search(criteria);
    return {
      ok: true,
      transfers: arr.map(transferToView),
      total: arr.length,
    };
  }
}
