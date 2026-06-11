/**
 * Handlers: SalesOrder + Invoice
 *
 * Sales:
 *   - CreateOrderHandler
 *   - AddOrderLineHandler (with optional pricing integration)
 *   - RemoveOrderLineHandler
 *   - ConfirmOrderHandler
 *   - FulfillOrderHandler
 *   - CancelOrderHandler
 *   - GetOrderHandler
 *   - ListOrdersHandler
 *
 * Invoices:
 *   - CreateInvoiceFromOrderHandler
 *   - IssueInvoiceHandler
 *   - RecordPaymentHandler
 *   - VoidInvoiceHandler
 *   - CloseInvoiceHandler
 *   - GetInvoiceHandler
 *   - ListInvoicesHandler
 */
import { CustomerRef, InvoiceId, SalesOrderId } from '@oserp-community/inventory/domain/value-objects/SalesOrderId';
import { Invoice } from '@oserp-community/inventory/domain/aggregates/Invoice';
import { InvoiceLine } from '@oserp-community/inventory/domain/entities/InvoiceLine';
import { Money } from '@oserp-community/inventory/domain/value-objects/Money';
import { SalesOrder } from '@oserp-community/inventory/domain/aggregates/SalesOrder';
import { InvoiceRepository } from '../ports/InvoiceRepositoryPort';
import { SalesOrderRepository } from '../ports/SalesOrderRepositoryPort';
import { SalesOrderPricingService } from '../services/SalesOrderPricingService';
import { makeOrderLine } from '../dto/SalesOrderDTOs';

// === SalesOrder handlers ===

export class CreateOrderHandler {
  constructor(private readonly repo: SalesOrderRepository) {}
  async execute(opts: {
    id: string;
    orderNumber?: string;
    customerId: string;
    customerGroupId?: string | null;
    currencyCode: string;
    notes?: string | null;
  }): Promise<string> {
    const orderNumber = opts.orderNumber ?? (await this.repo.nextOrderNumber());
    const order = SalesOrder.create({
      id: opts.id,
      orderNumber,
      customer: CustomerRef.of(opts.customerId, opts.customerGroupId ?? null),
      currencyCode: opts.currencyCode,
      notes: opts.notes ?? null,
    });
    await this.repo.save(order);
    void order.pullDomainEvents();
    return order.getId().getValue();
  }
}

export class AddOrderLineHandler {
  constructor(
    private readonly repo: SalesOrderRepository,
    private readonly pricing: SalesOrderPricingService,
  ) {}
  async execute(opts: {
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
    asOf?: Date;
  }): Promise<string> {
    const order = await this.repo.findById(SalesOrderId.of(opts.orderId));
    if (!order) throw new Error(`Order not found: ${opts.orderId}`);
    const currency = opts.currencyCode ?? order.getCurrencyCode();
    let unitPrice: Money;
    if (opts.unitPrice != null) {
      unitPrice = Money.of(opts.unitPrice, currency);
    } else if (opts.resolvePrice) {
      unitPrice = await this.pricing.resolveUnitPrice(
        {
          productId: opts.productId,
          quantity: Number(opts.quantity),
          customerId: order.getCustomer().getCustomerId(),
          customerGroupId: order.getCustomer().getCustomerGroupId(),
          currency,
        },
        opts.asOf,
      );
    } else {
      throw new Error('Either unitPrice or resolvePrice=true must be provided');
    }
    const line = makeOrderLine({
      id: opts.id,
      salesOrderId: order.getId().getValue(),
      productId: opts.productId,
      productName: opts.productName,
      productSku: opts.productSku,
      quantity: opts.quantity,
      uom: opts.uom,
      unitPriceAmount: unitPrice.getAmount(),
      currencyCode: unitPrice.getCurrency().getCode(),
      discountPercent: opts.discountPercent ?? 0,
      taxPercent: opts.taxPercent ?? 0,
      notes: opts.notes ?? null,
    });
    order.addLine(line);
    await this.repo.save(order);
    void order.pullDomainEvents();
    return line.getId();
  }
}

export class RemoveOrderLineHandler {
  constructor(private readonly repo: SalesOrderRepository) {}
  async execute(orderId: string, lineId: string): Promise<void> {
    const order = await this.repo.findById(SalesOrderId.of(orderId));
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.removeLine(lineId);
    await this.repo.save(order);
    void order.pullDomainEvents();
  }
}

export class ConfirmOrderHandler {
  constructor(
    private readonly repo: SalesOrderRepository,
    private readonly reservationService?: import('../services/ReservationService').ReservationService,
  ) {}
  async execute(orderId: string): Promise<{ reservationId?: string }> {
    const order = await this.repo.findById(SalesOrderId.of(orderId));
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.confirm();
    await this.repo.save(order);
    void order.pullDomainEvents();

    // Faz 6: Order confirm edildiğinde otomatik reservation oluştur
    if (this.reservationService) {
      // Her line için aynı lokasyonu varsay (MVP); daha sonra routing
      // stratejisi ile farklı lokasyonlara yönlendirilebilir.
      const lines = order.getLines().map((ol) => ({
        productId: ol.getProductId(),
        locationId: 'MAIN', // MVP: default location
        lotId: null,
        quantity: ol.getQuantity(),
        uom: ol.getUom(),
      }));
      const result = await this.reservationService.createReservation({
        id: `res_${orderId}_${Date.now()}`,
        orderId,
        customerId: order.getCustomer().getCustomerId(),
        lines,
        notes: `Auto-reservation for order ${order.getOrderNumber()}`,
      });
      if (!result.ok) {
        // Stok yetersizse order'ı geri al — MVP: hata fırlat
        throw new Error(
          `Reservation failed: ${result.error}${result.unallocatedQuantity ? ` (unallocated: ${result.unallocatedQuantity})` : ''}`,
        );
      }
      return result.reservation?.id !== undefined
        ? { reservationId: result.reservation.id }
        : {};
    }
    return {};
  }
}

export class FulfillOrderHandler {
  constructor(private readonly repo: SalesOrderRepository) {}
  async execute(orderId: string): Promise<void> {
    const order = await this.repo.findById(SalesOrderId.of(orderId));
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.fulfill();
    await this.repo.save(order);
    void order.pullDomainEvents();
  }
}

export class CancelOrderHandler {
  constructor(
    private readonly repo: SalesOrderRepository,
    private readonly reservationService?: import('../services/ReservationService').ReservationService,
    private readonly reservationRepo?: import('../ports/ReservationRepositoryPort').ReservationRepository,
  ) {}
  async execute(orderId: string, reason: string | null = null): Promise<void> {
    const order = await this.repo.findById(SalesOrderId.of(orderId));
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.cancel(reason);
    await this.repo.save(order);
    void order.pullDomainEvents();

    // Faz 6: Order iptal edilirse varsa reservation'ı release et
    if (this.reservationService && this.reservationRepo) {
      const reservation = await this.reservationRepo.findByOrderId(orderId);
      if (
        reservation &&
        reservation.getStatus().getKind() === 'HELD'
      ) {
        await this.reservationService.releaseReservation({
          reservationId: reservation.getId().getValue(),
          reason: `order_cancelled:${reason ?? 'no_reason'}`,
        });
      }
    }
  }
}

export class GetOrderHandler {
  constructor(private readonly repo: SalesOrderRepository) {}
  async execute(orderId: string): Promise<SalesOrder | null> {
    return this.repo.findById(SalesOrderId.of(orderId));
  }
}

export class ListOrdersHandler {
  constructor(private readonly repo: SalesOrderRepository) {}
  async execute(): Promise<ReadonlyArray<SalesOrder>> {
    return this.repo.search({});
  }
}

// === Invoice handlers ===

export class CreateInvoiceFromOrderHandler {
  constructor(
    private readonly orderRepo: SalesOrderRepository,
    private readonly invoiceRepo: InvoiceRepository,
  ) {}
  async execute(opts: {
    id: string;
    invoiceNumber?: string;
    salesOrderId: string;
    dueDate?: Date | null;
    notes?: string | null;
  }): Promise<string> {
    const order = await this.orderRepo.findById(SalesOrderId.of(opts.salesOrderId));
    if (!order) throw new Error(`Order not found: ${opts.salesOrderId}`);
    if (order.getStatus().getKind() !== 'CONFIRMED' && order.getStatus().getKind() !== 'FULFILLED') {
      throw new Error(`Cannot invoice order in status ${order.getStatus()}`);
    }
    if (order.getLines().length === 0) {
      throw new Error('Cannot invoice order without lines');
    }
    const invoiceNumber = opts.invoiceNumber ?? (await this.invoiceRepo.nextInvoiceNumber());
    const lines = order.getLines().map((ol) =>
      InvoiceLine.fromOrderLine(ol, {
        id: `invline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${ol.getId()}`,
        invoiceId: opts.id,
      }),
    );
    const invoice = Invoice.create({
      id: opts.id,
      invoiceNumber,
      salesOrderId: order.getId().getValue(),
      customerId: order.getCustomer().getCustomerId(),
      currencyCode: order.getCurrencyCode(),
      lines,
      dueDate: opts.dueDate ?? null,
      notes: opts.notes ?? null,
    });
    await this.invoiceRepo.save(invoice, []);
    void invoice.pullDomainEvents();

    // Mark order as INVOICED
    order.markInvoiced();
    await this.orderRepo.save(order);
    void order.pullDomainEvents();
    return invoice.getId().getValue();
  }
}

export class IssueInvoiceHandler {
  constructor(private readonly repo: InvoiceRepository) {}
  async execute(invoiceId: string): Promise<void> {
    const found = await this.repo.findById(InvoiceId.of(invoiceId));
    if (!found) throw new Error(`Invoice not found: ${invoiceId}`);
    found.invoice.issue();
    await this.repo.save(found.invoice, found.payments);
    void found.invoice.pullDomainEvents();
  }
}

export class RecordPaymentHandler {
  constructor(
    private readonly repo: InvoiceRepository,
    private readonly reservationService?: import('../services/ReservationService').ReservationService,
    private readonly reservationRepo?: import('../ports/ReservationRepositoryPort').ReservationRepository,
  ) {}
  async execute(opts: {
    id: string;
    invoiceId: string;
    amount: number;
    currencyCode: string;
    method: string;
    reference?: string | null;
  }): Promise<void> {
    const found = await this.repo.findById(InvoiceId.of(opts.invoiceId));
    if (!found) throw new Error(`Invoice not found: ${opts.invoiceId}`);
    const wasFullyPaidBefore = found.invoice.isFullyPaid();
    found.invoice.recordPayment({
      id: opts.id,
      amount: Money.of(opts.amount, opts.currencyCode),
      method: opts.method,
      reference: opts.reference ?? null,
    });
    await this.repo.save(found.invoice, found.invoice.getPayments());
    void found.invoice.pullDomainEvents();

    // Faz 6: Invoice tamamen ödendiyse, bağlı reservation'ı commit et
    if (
      !wasFullyPaidBefore &&
      found.invoice.isFullyPaid() &&
      this.reservationService &&
      this.reservationRepo
    ) {
      const reservation = await this.reservationRepo.findByOrderId(
        found.invoice.getSalesOrderId(),
      );
      if (reservation && reservation.getStatus().getKind() === 'HELD') {
        await this.reservationService.commitReservation({
          reservationId: reservation.getId().getValue(),
        });
      }
    }
  }
}

export class VoidInvoiceHandler {
  constructor(private readonly repo: InvoiceRepository) {}
  async execute(invoiceId: string, reason: string | null = null): Promise<void> {
    const found = await this.repo.findById(InvoiceId.of(invoiceId));
    if (!found) throw new Error(`Invoice not found: ${invoiceId}`);
    found.invoice.voidInvoice(reason);
    await this.repo.save(found.invoice, found.payments);
    void found.invoice.pullDomainEvents();
  }
}

export class CloseInvoiceHandler {
  constructor(private readonly repo: InvoiceRepository) {}
  async execute(invoiceId: string): Promise<void> {
    const found = await this.repo.findById(InvoiceId.of(invoiceId));
    if (!found) throw new Error(`Invoice not found: ${invoiceId}`);
    found.invoice.close();
    await this.repo.save(found.invoice, found.payments);
    void found.invoice.pullDomainEvents();
  }
}

export class GetInvoiceHandler {
  constructor(private readonly repo: InvoiceRepository) {}
  async execute(invoiceId: string): Promise<{ invoice: Invoice; payments: ReadonlyArray<unknown> } | null> {
    return this.repo.findById(InvoiceId.of(invoiceId));
  }
}

export class ListInvoicesHandler {
  constructor(private readonly repo: InvoiceRepository) {}
  async execute(): Promise<ReadonlyArray<Invoice>> {
    return this.repo.search({});
  }
}
