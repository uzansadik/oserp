/**
 * Port: LotDispatchStrategy
 *
 * Decides the order in which lots are consumed when a quantity is requested.
 * Strategies:
 *   - FEFO (First-Expired-First-Out): earliest expiry first
 *   - FIFO (First-In-First-Out): earliest receivedAt first
 *   - MANUAL: caller-provided lot order
 *
 * MVP: FEFO. Future: pluggable strategies via the container.
 */
import { Lot } from '../../domain/entities/Lot';

export interface LotDispatchStrategy {
  /**
   * Return the lots in the order they should be consumed.
   * Caller iterates and takes what they need.
   */
  order(lots: ReadonlyArray<Lot>, at: Date): ReadonlyArray<Lot>;

  /** Strategy identifier (for audit/debug). */
  readonly name: string;
}
