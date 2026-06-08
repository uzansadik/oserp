import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginCommand = z.infer<typeof loginSchema>;

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshSessionCommand = z.infer<typeof refreshSessionSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutCommand = z.infer<typeof logoutSchema>;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
};
