/**
 * Commands: Reservation
 *
 * Result tipi her handler'da aynı kalıp sadece içeriği değişir.
 * Genelde başarı: { ok: true }; başarısızlık: { ok: false, error: string }.
 */
import type {
  CreateReservationDTO,
  ReleaseReservationDTO,
  CommitReservationDTO,
} from '../dto/ReservationDTOs';
import type { ReservationView } from '../dto/ReservationDTOs';

export type CreateReservationCommand = CreateReservationDTO;
export type ReleaseReservationCommand = ReleaseReservationDTO;
export type CommitReservationCommand = CommitReservationDTO;

export interface ReservationResult {
  ok: boolean;
  reservation?: ReservationView;
  error?: string;
  /** Toplam yetersiz kalan miktar (allocation başarısızsa). */
  unallocatedQuantity?: string;
}
