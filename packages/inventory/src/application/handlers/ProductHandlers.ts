import {
  Barcode,
  BarcodeSymbology,
  Product,
  ProductId,
  ProductTypeVO,
  ProcurementPolicyVO,
  ReorderPolicy,
  Sku,
  TrackingTypeVO,
  Uom,
} from '../../domain';
import { ConflictError } from '../../domain/errors/ConflictError';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { ValidationError } from '../../domain/errors/ValidationError';
import {
  type AddBarcodeCommand,
  addBarcodeSchema,
  type ChangeProductTypeCommand,
  changeProductTypeSchema,
  type CreateProductCommand,
  createProductSchema,
  type DiscontinueProductCommand,
  discontinueProductSchema,
  type RemoveBarcodeCommand,
  removeBarcodeSchema,
  type SetReorderPolicyCommand,
  setReorderPolicySchema,
  type UpdateProductCommand,
  updateProductSchema,
} from '../commands/ProductCommands';
import type { ClockPort } from '../ports/ClockPort';
import type { UnitOfWorkPort } from '../ports/UnitOfWorkPort';
import type { CommandHandler } from '../Handler';

// ── CreateProduct ─────────────────────────────────────────────────────
export class CreateProductHandler
  implements CommandHandler<CreateProductCommand, { productId: string }>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: CreateProductCommand): Promise<{ productId: string }> {
    const cmd = createProductSchema.parse(input);
    const sku = Sku.create(cmd.sku);
    const type = ProductTypeVO.create(cmd.type);
    const procurementPolicy = ProcurementPolicyVO.create(cmd.procurementPolicy);
    const trackingType = TrackingTypeVO.create(cmd.trackingType);
    const baseUom = Uom.create(cmd.baseUom);
    const reorderPolicy = cmd.reorderPolicy
      ? ReorderPolicy.create({
          minQty: cmd.reorderPolicy.minQty ?? null,
          maxQty: cmd.reorderPolicy.maxQty ?? null,
          reorderQty: cmd.reorderPolicy.reorderQty ?? null,
          safetyStock: cmd.reorderPolicy.safetyStock ?? null,
        })
      : ReorderPolicy.none();
    const initialBarcode = cmd.initialBarcode
      ? Barcode.create(
          cmd.initialBarcode.code,
          cmd.initialBarcode.symbology as BarcodeSymbology,
          cmd.initialBarcode.isPrimary,
        )
      : undefined;

    return this.uow.execute(async (ctx) => {
      if (await ctx.products.existsBySku(sku)) {
        throw new ConflictError(`Sku already in use: ${sku.getValue()}`);
      }
      const product = Product.create({
        sku: cmd.sku,
        name: cmd.name,
        description: cmd.description ?? null,
        type,
        procurementPolicy,
        trackingType,
        baseUom,
        categoryId: cmd.categoryId ?? null,
        reorderPolicy,
        initialBarcode,
      });

      await ctx.products.save(product);
      const events = product.pullDomainEvents();
      await ctx.outbox.enqueue(events);
      return { productId: product.getId().toString() };
    });
  }
}

// ── UpdateProduct ─────────────────────────────────────────────────────
export class UpdateProductHandler
  implements CommandHandler<UpdateProductCommand, void>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateProductCommand): Promise<void> {
    const cmd = updateProductSchema.parse(input);
    const id = ProductId.create(cmd.productId);

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }

      const updates: Parameters<typeof product.updateBasicInfo>[0] = {};
      if (cmd.name !== undefined) updates.name = cmd.name;
      if (cmd.description !== undefined) updates.description = cmd.description;
      if (cmd.baseUom !== undefined) updates.baseUom = Uom.create(cmd.baseUom);
      if (cmd.categoryId !== undefined) updates.categoryId = cmd.categoryId;

      if (Object.keys(updates).length === 0) {
        return; // no-op
      }

      // Reconstitute → mutate → reconstitute is inefficient. We rely on
      // Product.updateBasicInfo mutating the instance in place.
      product.updateBasicInfo(updates);

      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}

// ── ChangeProductType ─────────────────────────────────────────────────
export class ChangeProductTypeHandler
  implements CommandHandler<ChangeProductTypeCommand, void>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: ChangeProductTypeCommand): Promise<void> {
    const cmd = changeProductTypeSchema.parse(input);
    const id = ProductId.create(cmd.productId);
    const newType = ProductTypeVO.create(cmd.newType);

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }
      product.changeType(newType);
      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}

// ── DiscontinueProduct ────────────────────────────────────────────────
export class DiscontinueProductHandler
  implements CommandHandler<DiscontinueProductCommand, void>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: DiscontinueProductCommand): Promise<void> {
    const cmd = discontinueProductSchema.parse(input);
    const id = ProductId.create(cmd.productId);
    const now = this.clock.now();

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }
      product.discontinue(now);
      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}

// ── SetReorderPolicy ──────────────────────────────────────────────────
export class SetReorderPolicyHandler
  implements CommandHandler<SetReorderPolicyCommand, void>
{
  constructor(
    private readonly uow: UnitOfWorkPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: SetReorderPolicyCommand): Promise<void> {
    const cmd = setReorderPolicySchema.parse(input);
    const id = ProductId.create(cmd.productId);
    const now = this.clock.now();

    if (!cmd.reorderPolicy) {
      throw new ValidationError('reorderPolicy is required');
    }

    const policy = ReorderPolicy.create({
      minQty: cmd.reorderPolicy.minQty ?? null,
      maxQty: cmd.reorderPolicy.maxQty ?? null,
      reorderQty: cmd.reorderPolicy.reorderQty ?? null,
      safetyStock: cmd.reorderPolicy.safetyStock ?? null,
    });

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }
      product.setReorderPolicy(policy, now);
      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}

// ── AddBarcode ────────────────────────────────────────────────────────
export class AddBarcodeHandler
  implements CommandHandler<AddBarcodeCommand, void>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: AddBarcodeCommand): Promise<void> {
    const cmd = addBarcodeSchema.parse(input);
    const id = ProductId.create(cmd.productId);
    const barcode = Barcode.create(
      cmd.barcode.code,
      cmd.barcode.symbology as BarcodeSymbology,
      cmd.barcode.isPrimary,
    );

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }
      product.addBarcode(barcode);
      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}

// ── RemoveBarcode ─────────────────────────────────────────────────────
export class RemoveBarcodeHandler
  implements CommandHandler<RemoveBarcodeCommand, void>
{
  constructor(private readonly uow: UnitOfWorkPort) {}

  async execute(input: RemoveBarcodeCommand): Promise<void> {
    const cmd = removeBarcodeSchema.parse(input);
    const id = ProductId.create(cmd.productId);

    await this.uow.execute(async (ctx) => {
      const product = await ctx.products.findById(id);
      if (!product) {
        throw new NotFoundError('Product', cmd.productId);
      }
      product.removeBarcode(cmd.code);
      await ctx.products.update(product);
      const events = product.pullDomainEvents();
      if (events.length > 0) {
        await ctx.outbox.enqueue(events);
      }
    });
  }
}
