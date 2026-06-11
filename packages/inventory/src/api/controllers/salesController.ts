/**
 * Order + Invoice Controller
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { InventoryContainer } from '../../container';
import { orderToView, invoiceToView } from '../../application/dto/SalesOrderDTOs';

export function makeSalesController(c: InventoryContainer) {
  return {
    // === Orders ===
    async createOrder(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        id: string;
        orderNumber?: string;
        customerId: string;
        customerGroupId?: string | null;
        currencyCode: string;
        notes?: string | null;
      } = {
        id: String(body.id),
        customerId: String(body.customerId),
        currencyCode: String(body.currencyCode),
      };
      if (body.orderNumber) dto.orderNumber = String(body.orderNumber);
      if (body.customerGroupId != null) dto.customerGroupId = String(body.customerGroupId);
      if (body.notes) dto.notes = String(body.notes);
      const id = await c.commands.createOrder.execute(dto);
      void reply.code(201);
      return { id };
    },

    async addLine(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        id: string;
        orderId: string;
        productId: string;
        productName: string;
        productSku: string;
        quantity: string;
        uom: string;
        unitPrice?: number;
        currencyCode?: string;
        discountPercent?: number;
        taxPercent?: number;
        notes?: string | null;
        resolvePrice?: boolean;
      } = {
        id: String(body.id ?? `ol_${Date.now()}`),
        orderId: String(body.orderId),
        productId: String(body.productId),
        productName: String(body.productName ?? body.productId),
        productSku: String(body.productSku ?? body.productId),
        quantity: String(body.quantity),
        uom: String(body.uom ?? 'EA'),
      };
      if (body.unitPrice != null) dto.unitPrice = Number(body.unitPrice);
      if (body.currencyCode) dto.currencyCode = String(body.currencyCode);
      if (body.discountPercent != null) dto.discountPercent = Number(body.discountPercent);
      if (body.taxPercent != null) dto.taxPercent = Number(body.taxPercent);
      if (body.notes) dto.notes = String(body.notes);
      if (body.resolvePrice === true) dto.resolvePrice = true;
      const id = await c.commands.addOrderLine.execute(dto);
      void reply.code(201);
      return { id };
    },

    async removeLine(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      await c.commands.removeOrderLine.execute(String(body.orderId), String(body.lineId));
      return { ok: true };
    },

    async confirmOrder(req: FastifyRequest) {
      const params = req.params as { id: string };
      await c.commands.confirmOrder.execute(params.id);
      return { ok: true };
    },

    async fulfillOrder(req: FastifyRequest) {
      const params = req.params as { id: string };
      await c.commands.fulfillOrder.execute(params.id);
      return { ok: true };
    },

    async cancelOrder(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      await c.commands.cancelOrder.execute(String(body.orderId), body.reason ? String(body.reason) : null);
      return { ok: true };
    },

    async getOrder(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { id: string };
      const order = await c.queries.getOrder.execute(params.id);
      if (!order) {
        void reply.code(404);
        return { error: 'Order not found' };
      }
      return orderToView(order);
    },

    async listOrders(_req: FastifyRequest) {
      const orders = await c.queries.listOrders.execute();
      return orders.map(orderToView);
    },

    // === Invoices ===
    async createInvoiceFromOrder(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        id: string;
        salesOrderId: string;
        invoiceNumber?: string;
        dueDate?: Date | null;
        notes?: string | null;
      } = {
        id: String(body.id),
        salesOrderId: String(body.salesOrderId),
      };
      if (body.invoiceNumber) dto.invoiceNumber = String(body.invoiceNumber);
      if (body.dueDate) dto.dueDate = new Date(String(body.dueDate));
      if (body.notes) dto.notes = String(body.notes);
      const id = await c.commands.createInvoiceFromOrder.execute(dto);
      void reply.code(201);
      return { id };
    },

    async issueInvoice(req: FastifyRequest) {
      const params = req.params as { id: string };
      await c.commands.issueInvoice.execute(params.id);
      return { ok: true };
    },

    async recordPayment(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        id: string;
        invoiceId: string;
        amount: number;
        currencyCode: string;
        method: string;
        reference?: string | null;
      } = {
        id: String(body.id ?? `pay_${Date.now()}`),
        invoiceId: String(body.invoiceId),
        amount: Number(body.amount),
        currencyCode: String(body.currencyCode),
        method: String(body.method),
      };
      if (body.reference) dto.reference = String(body.reference);
      await c.commands.recordPayment.execute(dto);
      void reply.code(201);
      return { ok: true };
    },

    async voidInvoice(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      await c.commands.voidInvoice.execute(String(body.invoiceId), body.reason ? String(body.reason) : null);
      return { ok: true };
    },

    async closeInvoice(req: FastifyRequest) {
      const params = req.params as { id: string };
      await c.commands.closeInvoice.execute(params.id);
      return { ok: true };
    },

    async getInvoice(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { id: string };
      const found = await c.queries.getInvoice.execute(params.id);
      if (!found) {
        void reply.code(404);
        return { error: 'Invoice not found' };
      }
      return invoiceToView(found.invoice);
    },

    async listInvoices(_req: FastifyRequest) {
      const invoices = await c.queries.listInvoices.execute();
      return invoices.map(invoiceToView);
    },
  };
}
