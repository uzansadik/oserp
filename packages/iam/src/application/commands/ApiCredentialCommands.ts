import { z } from 'zod';

export const issueApiCredentialSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(100),
});
export type IssueApiCredentialCommand = z.infer<typeof issueApiCredentialSchema>;

export const rotateApiCredentialSchema = z.object({
  apiKeyId: z.string().uuid(),
});
export type RotateApiCredentialCommand = z.infer<typeof rotateApiCredentialSchema>;

export const revokeApiCredentialSchema = z.object({
  apiKeyId: z.string().uuid(),
});
export type RevokeApiCredentialCommand = z.infer<typeof revokeApiCredentialSchema>;

/**
 * Düz metin API anahtarı yalnızca üretim/rotasyon anında bir kez döner.
 * Format: `${prefix}.${secret}`.
 */
export type IssuedApiKey = {
  apiKeyId: string;
  prefix: string;
  apiKey: string;
};
