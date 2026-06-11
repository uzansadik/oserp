export class PermissionAction {
  private static readonly allowedActions = new Set([
    'create',
    'read',
    'update',
    'delete',
    'list',
    'approve',
    'reject',
    'cancel',
    'assign',
    'revoke',
    'manage',
    'export',
    'import',
    'print',
    'adjust',
    'transfer',
    'close',
    'open',
    'archive',
    'restore',
    '*',
  ]);

  private constructor(private readonly value: string) {}

  static create(value: string): PermissionAction {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Permission action cannot be empty');
    }

    if (!/^[a-z][a-z0-9_]*$/.test(normalized) && normalized !== '*') {
      throw new Error(
        'Permission action must start with a letter and contain only lowercase letters, numbers or underscore',
      );
    }

    if (!PermissionAction.allowedActions.has(normalized)) {
      throw new Error(`Unsupported permission action: ${normalized}`);
    }

    return new PermissionAction(normalized);
  }

  static createAction(): PermissionAction {
    return new PermissionAction('create');
  }

  static read(): PermissionAction {
    return new PermissionAction('read');
  }

  static update(): PermissionAction {
    return new PermissionAction('update');
  }

  static delete(): PermissionAction {
    return new PermissionAction('delete');
  }

  static approve(): PermissionAction {
    return new PermissionAction('approve');
  }

  static manage(): PermissionAction {
    return new PermissionAction('manage');
  }

  equals(other: PermissionAction): boolean {
    return this.value === other.value;
  }

  getValue(): string {
    return this.value;
  }
}
