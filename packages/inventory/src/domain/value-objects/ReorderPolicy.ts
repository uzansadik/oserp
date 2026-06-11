import { ValidationError } from '../errors/ValidationError';

/**
 * ReorderPolicy — Yeniden sipariş politikası (minimum/maximum stok eşikleri).
 *
 * Tüm alanlar opsiyoneldir (null = "yok"). Ancak verilmişse:
 *  - maxQty >= safetyStock
 *  - reorderQty > 0
 *  - minQty >= 0
 */
export class ReorderPolicy {
  private constructor(
    private readonly minQty: string | null,
    private readonly maxQty: string | null,
    private readonly reorderQty: string | null,
    private readonly safetyStock: string | null,
  ) {}

  static create(params: {
    minQty?: string | null;
    maxQty?: string | null;
    reorderQty?: string | null;
    safetyStock?: string | null;
  }): ReorderPolicy {
    const min = params.minQty ?? null;
    const max = params.maxQty ?? null;
    const reorder = params.reorderQty ?? null;
    const safety = params.safetyStock ?? null;

    if (min !== null && !/^\d+(\.\d+)?$/.test(min)) {
      throw new ValidationError(`minQty must be non-negative decimal: ${min}`);
    }
    if (max !== null && !/^\d+(\.\d+)?$/.test(max)) {
      throw new ValidationError(`maxQty must be non-negative decimal: ${max}`);
    }
    if (reorder !== null && !/^\d+(\.\d+)?$/.test(reorder)) {
      throw new ValidationError(`reorderQty must be positive decimal: ${reorder}`);
    }
    if (safety !== null && !/^\d+(\.\d+)?$/.test(safety)) {
      throw new ValidationError(`safetyStock must be non-negative decimal: ${safety}`);
    }
    if (min !== null && max !== null && Number(max) < Number(min)) {
      throw new ValidationError('maxQty must be >= minQty');
    }
    if (reorder !== null && Number(reorder) <= 0) {
      throw new ValidationError('reorderQty must be > 0');
    }
    if (safety !== null && max !== null && Number(safety) > Number(max)) {
      throw new ValidationError('safetyStock must be <= maxQty');
    }
    return new ReorderPolicy(min, max, reorder, safety);
  }

  static none(): ReorderPolicy {
    return new ReorderPolicy(null, null, null, null);
  }

  getMinQty(): string | null {
    return this.minQty;
  }
  getMaxQty(): string | null {
    return this.maxQty;
  }
  getReorderQty(): string | null {
    return this.reorderQty;
  }
  getSafetyStock(): string | null {
    return this.safetyStock;
  }

  hasAny(): boolean {
    return (
      this.minQty !== null ||
      this.maxQty !== null ||
      this.reorderQty !== null ||
      this.safetyStock !== null
    );
  }

  toJSON(): {
    minQty: string | null;
    maxQty: string | null;
    reorderQty: string | null;
    safetyStock: string | null;
  } {
    return {
      minQty: this.minQty,
      maxQty: this.maxQty,
      reorderQty: this.reorderQty,
      safetyStock: this.safetyStock,
    };
  }

  equals(other: ReorderPolicy): boolean {
    return (
      this.minQty === other.minQty &&
      this.maxQty === other.maxQty &&
      this.reorderQty === other.reorderQty &&
      this.safetyStock === other.safetyStock
    );
  }
}
