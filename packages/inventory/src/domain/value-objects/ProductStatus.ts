/**
 * ProductStatus — Ürün yaşam döngüsü.
 */
export enum ProductStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
}

import { ValidationError } from '../errors/ValidationError';

const ALLOWED: ReadonlyArray<ProductStatusEnum> = [
  ProductStatusEnum.ACTIVE,
  ProductStatusEnum.INACTIVE,
  ProductStatusEnum.DISCONTINUED,
];

export class ProductStatusVO {
  private constructor(private readonly value: ProductStatusEnum) {}

  static create(status: ProductStatusEnum | string): ProductStatusVO {
    const upper = String(status).toUpperCase() as ProductStatusEnum;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid product status: ${status} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new ProductStatusVO(upper);
  }

  static active(): ProductStatusVO {
    return new ProductStatusVO(ProductStatusEnum.ACTIVE);
  }
  static inactive(): ProductStatusVO {
    return new ProductStatusVO(ProductStatusEnum.INACTIVE);
  }
  static discontinued(): ProductStatusVO {
    return new ProductStatusVO(ProductStatusEnum.DISCONTINUED);
  }

  getValue(): ProductStatusEnum {
    return this.value;
  }

  isActive(): boolean {
    return this.value === ProductStatusEnum.ACTIVE;
  }
  isInactive(): boolean {
    return this.value === ProductStatusEnum.INACTIVE;
  }
  isDiscontinued(): boolean {
    return this.value === ProductStatusEnum.DISCONTINUED;
  }

  equals(other: ProductStatusVO): boolean {
    return this.value === other.value;
  }

  static equals(a: ProductStatusVO, b: ProductStatusVO): boolean {
    return a.value === b.value;
  }
}
