import { CatalogBaseError } from './CatalogBaseError';

export class InvalidSKU extends CatalogBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSKU';
  }
}
