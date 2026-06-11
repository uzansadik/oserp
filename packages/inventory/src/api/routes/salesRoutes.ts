/**
 * Sales (Orders + Invoices) HTTP routes
 */
import type { FastifyInstance } from 'fastify';
import type { InventoryContainer } from '../../container';
import { makeSalesController } from '../controllers/salesController';

export async function registerSalesRoutes(
  app: FastifyInstance,
  container: InventoryContainer,
): Promise<void> {
  const ctrl = makeSalesController(container);

  // Orders
  app.post('/orders', ctrl.createOrder);
  app.get('/orders', ctrl.listOrders);
  app.get('/orders/:id', ctrl.getOrder);
  app.post('/orders/:id/confirm', ctrl.confirmOrder);
  app.post('/orders/:id/fulfill', ctrl.fulfillOrder);
  app.post('/orders/cancel', ctrl.cancelOrder);
  app.post('/orders/lines', ctrl.addLine);
  app.post('/orders/lines/remove', ctrl.removeLine);

  // Invoices
  app.post('/invoices/from-order', ctrl.createInvoiceFromOrder);
  app.get('/invoices', ctrl.listInvoices);
  app.get('/invoices/:id', ctrl.getInvoice);
  app.post('/invoices/:id/issue', ctrl.issueInvoice);
  app.post('/invoices/:id/close', ctrl.closeInvoice);
  app.post('/invoices/payments', ctrl.recordPayment);
  app.post('/invoices/void', ctrl.voidInvoice);
}
