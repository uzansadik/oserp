import { PermissionAction } from '../value-objects/PermissionAction';
import { PermissionCode } from '../value-objects/PermissionCode';
import { PermissionDescription } from '../value-objects/PermissionDescription';
import { PermissionId } from '../value-objects/PermissionId';
import { PermissionModule } from '../value-objects/PermissionModule';
import { PermissionResource } from '../value-objects/PermissionResource';

export type CreatePermissionProps = {
  module: string;
  resource: string;
  action: string;
  description?: string | null;
};

export type ReconstitutePermissionProps = {
  id: string;
  module: string;
  resource: string;
  action: string;
  code: string;
  description?: string | null;
  createdAt: Date;
};

export class Permission {
  private constructor(
    private readonly id: PermissionId,
    private readonly module: PermissionModule,
    private readonly resource: PermissionResource,
    private readonly action: PermissionAction,
    private readonly code: PermissionCode,
    private description: PermissionDescription | null,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreatePermissionProps): Permission {
    const module = PermissionModule.create(props.module);
    const resource = PermissionResource.create(props.resource);
    const action = PermissionAction.create(props.action);

    const code = PermissionCode.fromParts({
      module,
      resource,
      action,
    });

    return new Permission(
      PermissionId.generate(),
      module,
      resource,
      action,
      code,
      props.description ? PermissionDescription.create(props.description) : null,
      new Date(),
    );
  }

  static reconstitute(props: ReconstitutePermissionProps): Permission {
    const module = PermissionModule.create(props.module);
    const resource = PermissionResource.create(props.resource);
    const action = PermissionAction.create(props.action);
    const code = PermissionCode.create(props.code);

    const expectedCode = PermissionCode.fromParts({
      module,
      resource,
      action,
    });

    if (!code.equals(expectedCode)) {
      throw new Error(
        `Permission code mismatch. Expected ${expectedCode.getValue()}, got ${code.getValue()}`,
      );
    }

    return new Permission(
      PermissionId.create(props.id),
      module,
      resource,
      action,
      code,
      props.description ? PermissionDescription.create(props.description) : null,
      props.createdAt,
    );
  }

  changeDescription(description: string | null): void {
    this.description = description ? PermissionDescription.create(description) : null;
  }

  matches(code: PermissionCode): boolean {
    return this.code.equals(code);
  }

  belongsToModule(module: PermissionModule): boolean {
    return this.module.equals(module);
  }

  getId(): PermissionId {
    return this.id;
  }

  getModule(): PermissionModule {
    return this.module;
  }

  getResource(): PermissionResource {
    return this.resource;
  }

  getAction(): PermissionAction {
    return this.action;
  }

  getCode(): PermissionCode {
    return this.code;
  }

  getDescription(): PermissionDescription | null {
    return this.description;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
