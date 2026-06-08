import { z } from 'zod';

export const getUserByIdSchema = z.object({
  userId: z.string().uuid(),
});
export type GetUserByIdQuery = z.infer<typeof getUserByIdSchema>;

export const getUserByEmailSchema = z.object({
  email: z.string().email(),
});
export type GetUserByEmailQuery = z.infer<typeof getUserByEmailSchema>;

export type ListUsersQuery = Record<string, never>;

export type UserView = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
