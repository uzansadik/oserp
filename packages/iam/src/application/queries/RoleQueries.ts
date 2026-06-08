import { z } from 'zod';

export const getRoleByIdSchema = z.object({
  roleId: z.string().uuid(),
});
export type GetRoleByIdQuery = z.infer<typeof getRoleByIdSchema>;

export const listRolesSchema = z.object({
  companyId: z.string().uuid().nullable(),
});
export type ListRolesQuery = z.infer<typeof listRolesSchema>;

export type ListPermissionsQuery = Record<string, never>;

export const getEffectivePermissionsSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
});
export type GetEffectivePermissionsQuery = z.infer<typeof getEffectivePermissionsSchema>;

export type RoleView = {
  id: string;
  companyId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  status: string;
  permissionCodes: string[];
};

export type PermissionView = {
  id: string;
  module: string;
  resource: string;
  action: string;
  code: string;
  description: string | null;
  createdAt: Date;
};

export type EffectivePermissionsView = {
  userId: string;
  companyId: string;
  permissionCodes: string[];
};
