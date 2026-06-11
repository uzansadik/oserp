/**
 * PriceList Controller — translates HTTP requests to handler calls.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { InventoryContainer } from '../../container';
import { decisionToView, entryToView, priceListToView } from '../../application/dto/PriceListDTOs';

export function makePriceListController(c: InventoryContainer) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const id = await c.commands.createPriceList.execute({
        id: String(body.id ?? `pl_${Date.now()}`),
        code: String(body.code),
        name: String(body.name),
        description: (body.description as string | null | undefined) ?? null,
        scopeKind: body.scopeKind as 'GLOBAL' | 'CUSTOMER' | 'CUSTOMER_GROUP',
        scopeTargetId: (body.scopeTargetId as string | null | undefined) ?? null,
        baseCurrency: String(body.baseCurrency),
        activeFrom: String(body.activeFrom ?? new Date().toISOString()),
        activeTo: (body.activeTo as string | null | undefined) ?? null,
      });
      void reply.code(201);
      return { id };
    },

    async activate(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { id: string };
      await c.commands.activatePriceList.execute(params.id);
      void reply.code(204);
      return null;
    },

    async addEntry(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        id: string;
        priceListId: string;
        productId: string;
        unitPrice: number;
        currency: string;
        discountKind: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE';
        discountPercent?: number;
        discountFixedAmount?: number;
        overridePrice?: number;
        minQuantity?: number;
        effectiveFrom: string;
        effectiveTo?: string | null;
      } = {
        id: String(body.id ?? `ple_${Date.now()}`),
        priceListId: String(body.priceListId),
        productId: String(body.productId),
        unitPrice: Number(body.unitPrice),
        currency: String(body.currency),
        discountKind: (body.discountKind as 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE') ?? 'NONE',
        effectiveFrom: String(body.effectiveFrom ?? new Date().toISOString()),
      };
      if (body.discountPercent != null) dto.discountPercent = Number(body.discountPercent);
      if (body.discountFixedAmount != null) dto.discountFixedAmount = Number(body.discountFixedAmount);
      if (body.overridePrice != null) dto.overridePrice = Number(body.overridePrice);
      if (body.minQuantity != null) dto.minQuantity = Number(body.minQuantity);
      if (body.effectiveTo) dto.effectiveTo = String(body.effectiveTo);
      const entryId = await c.commands.addEntry.execute(dto);
      void reply.code(201);
      return { id: entryId };
    },

    async updateEntry(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      const newEntry = (body.newEntry ?? {}) as Record<string, unknown>;
      const dto: {
        priceListId: string;
        oldEntryId: string;
        newEntry: {
          id: string;
          priceListId: string;
          productId: string;
          unitPrice: number;
          currency: string;
          discountKind: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE';
          discountPercent?: number;
          discountFixedAmount?: number;
          overridePrice?: number;
          minQuantity?: number;
          effectiveFrom: string;
          effectiveTo?: string | null;
        };
      } = {
        priceListId: String(body.priceListId),
        oldEntryId: String(body.oldEntryId),
        newEntry: {
          id: String(newEntry.id ?? `ple_${Date.now()}`),
          priceListId: String(body.priceListId),
          productId: String(newEntry.productId),
          unitPrice: Number(newEntry.unitPrice),
          currency: String(newEntry.currency),
          discountKind: (newEntry.discountKind as 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'OVERRIDE_PRICE') ?? 'NONE',
          effectiveFrom: String(newEntry.effectiveFrom ?? new Date().toISOString()),
        },
      };
      if (newEntry.discountPercent != null) dto.newEntry.discountPercent = Number(newEntry.discountPercent);
      if (newEntry.discountFixedAmount != null) dto.newEntry.discountFixedAmount = Number(newEntry.discountFixedAmount);
      if (newEntry.overridePrice != null) dto.newEntry.overridePrice = Number(newEntry.overridePrice);
      if (newEntry.minQuantity != null) dto.newEntry.minQuantity = Number(newEntry.minQuantity);
      if (newEntry.effectiveTo) dto.newEntry.effectiveTo = String(newEntry.effectiveTo);
      const newId = await c.commands.updateEntry.execute(dto);
      return { id: newId };
    },

    async archive(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { id: string };
      await c.commands.archivePriceList.execute({ priceListId: params.id });
      void reply.code(204);
      return null;
    },

    async getById(req: FastifyRequest, reply: FastifyReply) {
      const params = req.params as { id: string };
      const list = await c.queries.getPriceList.execute(params.id);
      if (!list) {
        void reply.code(404);
        return { error: 'PriceList not found' };
      }
      return {
        ...priceListToView(list),
        entries: list.getEntries().map(entryToView),
      };
    },

    async list(_req: FastifyRequest) {
      const lists = await c.queries.listPriceLists.execute();
      return lists.map(priceListToView);
    },

    async calculate(req: FastifyRequest) {
      const body = req.body as Record<string, unknown>;
      const dto: {
        productId: string;
        quantity: number;
        customerId?: string | null;
        customerGroupId?: string | null;
        targetCurrency: string;
        asOf?: string;
      } = {
        productId: String(body.productId),
        quantity: Number(body.quantity),
        targetCurrency: String(body.targetCurrency),
      };
      if (body.customerId != null) dto.customerId = String(body.customerId);
      if (body.customerGroupId != null) dto.customerGroupId = String(body.customerGroupId);
      if (body.asOf != null) dto.asOf = String(body.asOf);
      const decision = await c.queries.calculatePrice.execute(dto);
      if (!decision) {
        return { decision: null, message: 'No applicable price found' };
      }
      return { decision: decisionToView(decision) };
    },

    async setFx(req: FastifyRequest, reply: FastifyReply) {
      const body = req.body as Record<string, unknown>;
      await c.commands.setExchangeRate.execute({
        fromCurrency: String(body.fromCurrency),
        toCurrency: String(body.toCurrency),
        rate: Number(body.rate),
        effectiveFrom: String(body.effectiveFrom ?? new Date().toISOString()),
        effectiveTo: (body.effectiveTo as string | null | undefined) ?? null,
        source: (body.source as string | undefined) ?? 'MANUAL',
      });
      void reply.code(201);
      return { ok: true };
    },
  };
}
