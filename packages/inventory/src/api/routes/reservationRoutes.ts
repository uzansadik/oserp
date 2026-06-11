/**
 * Reservation HTTP routes
 */
import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { makeReservationController } from '../controllers/reservationController';

export async function registerReservationRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const ctrl = makeReservationController(container);

  app.post('/reservations', ctrl.createReservation);
  app.get('/reservations', ctrl.listReservations);
  app.get('/reservations/:id', ctrl.getReservation);
  app.post('/reservations/release', ctrl.releaseReservation);
  app.post('/reservations/commit', ctrl.commitReservation);
}
