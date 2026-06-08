import { PermissionAction } from './PermissionAction';
import { PermissionModule } from './PermissionModule';
import { PermissionResource } from './PermissionResource';

export class PermissionCode {
  private constructor(private readonly value: string) {}

  private static parseParts(value: string): [string, string, string] {
    const parts = value.split('.');

    if (parts.length !== 3) {
      throw new Error('Permission code must be in format: module.resource.action');
    }

    return parts as [string, string, string];
  }

  static create(value: string): PermissionCode {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Permission code cannot be empty');
    }

    const [module, resource, action] = PermissionCode.parseParts(normalized);

    PermissionModule.create(module);
    PermissionResource.create(resource);
    PermissionAction.create(action);

    return new PermissionCode(normalized);
  }

  static fromParts(props: {
    module: PermissionModule;
    resource: PermissionResource;
    action: PermissionAction;
  }): PermissionCode {
    return new PermissionCode(
      `${props.module.getValue()}.${props.resource.getValue()}.${props.action.getValue()}`,
    );
  }

  getModule(): PermissionModule {
    const [module] = PermissionCode.parseParts(this.value);
    return PermissionModule.create(module);
  }

  getResource(): PermissionResource {
    const [, resource] = PermissionCode.parseParts(this.value);
    return PermissionResource.create(resource);
  }

  getAction(): PermissionAction {
    const [, , action] = PermissionCode.parseParts(this.value);
    return PermissionAction.create(action);
  }

  equals(other: PermissionCode): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
