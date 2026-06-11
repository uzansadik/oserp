/**
 * ProductType — Ürünün stoklanabilirlik/üretilebilirlik kategorisi.
 *
 * - STORABLE: Stoklanabilir fiziksel ürün (hammadde, yarı mamul, mamul)
 * - CONSUMABLE: Stok takibi olmayan, doğrudan tüketilen (küçük ofis malzemesi)
 * - SERVICE: Hizmet (kurulum, danışmanlık) — fiziksel stok yok
 * - KIT: Paket ürün (satış anında alt bileşenlerine ayrılır, kendi stoğu yok)
 *
 * PHANTOM BoM context'inde yaşar; burada sadece flag (Product.isPhantom) olarak
 * bulunur ve SKT tipi olarak enum'da yer almaz.
 */
export enum ProductType {
  STORABLE = 'STORABLE',
  CONSUMABLE = 'CONSUMABLE',
  SERVICE = 'SERVICE',
  KIT = 'KIT',
}

const ALLOWED: ReadonlyArray<ProductType> = [
  ProductType.STORABLE,
  ProductType.CONSUMABLE,
  ProductType.SERVICE,
  ProductType.KIT,
];

import { ValidationError } from '../errors/ValidationError';

export class ProductTypeVO {
  private constructor(private readonly value: ProductType) {}

  static create(type: ProductType | string): ProductTypeVO {
    const upper = String(type).toUpperCase() as ProductType;
    if (!ALLOWED.includes(upper)) {
      throw new ValidationError(
        `Invalid product type: ${type} (allowed: ${ALLOWED.join(', ')})`,
      );
    }
    return new ProductTypeVO(upper);
  }

  static storable(): ProductTypeVO {
    return new ProductTypeVO(ProductType.STORABLE);
  }
  static consumable(): ProductTypeVO {
    return new ProductTypeVO(ProductType.CONSUMABLE);
  }
  static service(): ProductTypeVO {
    return new ProductTypeVO(ProductType.SERVICE);
  }
  static kit(): ProductTypeVO {
    return new ProductTypeVO(ProductType.KIT);
  }

  getValue(): ProductType {
    return this.value;
  }

  isStorable(): boolean {
    return this.value === ProductType.STORABLE;
  }
  isConsumable(): boolean {
    return this.value === ProductType.CONSUMABLE;
  }
  isService(): boolean {
    return this.value === ProductType.SERVICE;
  }
  isKit(): boolean {
    return this.value === ProductType.KIT;
  }

  equals(other: ProductTypeVO): boolean {
    return this.value === other.value;
  }

  static equals(a: ProductTypeVO, b: ProductTypeVO): boolean {
    return a.value === b.value;
  }
}
