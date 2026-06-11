/**
 * Handlers: Reservation
 *
 * ReservationService'i saran komut ve sorgu handler'ları. Service'in kendisi
 * FEFO + InventoryLevel reserve/release/commit iş mantığını içerir; bu
 * handler'lar sadece service'i çağırır ve DTO/View'a map eder.
 */
import type { ReservationService } from '../services/ReservationService';
import type { ReservationRepository } from '../ports/ReservationRepositoryPort';
import type {
  CreateReservationCommand,
  ReleaseReservationCommand,
  CommitReservationCommand,
  ReservationResult,
} from '../commands/ReservationCommands';
import type { ListReservationsQuery, ReservationListResult } from '../queries/ReservationQueries';
import { reservationToView } from '../dto/ReservationDTOs';

export class CreateReservationHandler {
  constructor(private readonly service: ReservationService) {}
  async execute(cmd: CreateReservationCommand): Promise<ReservationResult> {
    return this.service.createReservation(cmd);
  }
}

export class ReleaseReservationHandler {
  constructor(private readonly service: ReservationService) {}
  async execute(cmd: ReleaseReservationCommand): Promise<ReservationResult> {
    return this.service.releaseReservation(cmd);
  }
}

export class CommitReservationHandler {
  constructor(private readonly service: ReservationService) {}
  async execute(cmd: CommitReservationCommand): Promise<ReservationResult> {
    return this.service.commitReservation(cmd);
  }
}

export class GetReservationHandler {
  constructor(private readonly repo: ReservationRepository) {}
  async execute(reservationId: string): Promise<ReservationResult> {
    const id = (await import('@oserp-community/inventory/domain/value-objects/ReservationId')).ReservationId.of(reservationId);
    const r = await this.repo.findById(id);
    if (!r) return { ok: false, error: `Reservation not found: ${reservationId}` };
    return { ok: true, reservation: reservationToView(r) };
  }
}

export class ListReservationsHandler {
  constructor(private readonly repo: ReservationRepository) {}
  async execute(query: ListReservationsQuery): Promise<ReservationListResult> {
    const criteria: Parameters<ReservationRepository['search']>[0] = {};
    if (query.orderId !== undefined) criteria.orderId = query.orderId;
    if (query.customerId !== undefined) criteria.customerId = query.customerId;
    if (query.status !== undefined) criteria.status = query.status;
    if (query.locationId !== undefined) criteria.locationId = query.locationId;
    if (query.productId !== undefined) criteria.productId = query.productId;
    if (query.activeOnly !== undefined) criteria.activeOnly = query.activeOnly;
    if (query.limit !== undefined) criteria.limit = query.limit;
    if (query.offset !== undefined) criteria.offset = query.offset;
    const arr = await this.repo.search(criteria);
    return {
      ok: true,
      reservations: arr.map(reservationToView),
      total: arr.length,
    };
  }
}
