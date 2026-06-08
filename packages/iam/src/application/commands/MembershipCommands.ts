import { z } from 'zod';

export const grantMembershipSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).optional(),
});
export type GrantMembershipCommand = z.infer<typeof grantMembershipSchema>;

export const assignRoleToMemberSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type AssignRoleToMemberCommand = z.infer<typeof assignRoleToMemberSchema>;

export const revokeRoleFromMemberSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type RevokeRoleFromMemberCommand = z.infer<typeof revokeRoleFromMemberSchema>;

export const suspendMembershipSchema = z.object({
  membershipId: z.string().uuid(),
});
export type SuspendMembershipCommand = z.infer<typeof suspendMembershipSchema>;
