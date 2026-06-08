import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(3).max(50),
  displayName: z.string().min(1),
  companyId: z.string().uuid().nullable(),
  description: z.string().max(500).nullable().optional(),
  isSystemRole: z.boolean().optional(),
});
export type CreateRoleCommand = z.infer<typeof createRoleSchema>;

export const renameRoleSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(3).max(50),
  displayName: z.string().min(1),
});
export type RenameRoleCommand = z.infer<typeof renameRoleSchema>;

export const assignPermissionToRoleSchema = z.object({
  roleId: z.string().uuid(),
  permissionCode: z.string().min(1),
});
export type AssignPermissionToRoleCommand = z.infer<typeof assignPermissionToRoleSchema>;

export const revokePermissionFromRoleSchema = z.object({
  roleId: z.string().uuid(),
  permissionCode: z.string().min(1),
});
export type RevokePermissionFromRoleCommand = z.infer<typeof revokePermissionFromRoleSchema>;

export const deactivateRoleSchema = z.object({
  roleId: z.string().uuid(),
});
export type DeactivateRoleCommand = z.infer<typeof deactivateRoleSchema>;
