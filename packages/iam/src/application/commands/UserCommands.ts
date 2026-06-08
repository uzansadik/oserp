import { z } from 'zod';

export const registerUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  surname: z.string().min(1, 'Surname cannot be empty'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(3).max(20),
  password: z.string().min(8),
});
export type RegisterUserCommand = z.infer<typeof registerUserSchema>;

export const changePasswordSchema = z.object({
  userId: z.string().uuid(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
export type ChangePasswordCommand = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  userId: z.string().uuid(),
});
export type VerifyEmailCommand = z.infer<typeof verifyEmailSchema>;

export const changeUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['active', 'inactive', 'suspended', 'invited']),
});
export type ChangeUserStatusCommand = z.infer<typeof changeUserStatusSchema>;
