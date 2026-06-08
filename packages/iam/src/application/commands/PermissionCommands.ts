import { z } from 'zod';

export const createPermissionSchema = z.object({
  module: z.string().min(1).max(50),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(500).nullable().optional(),
});
export type CreatePermissionCommand = z.infer<typeof createPermissionSchema>;
