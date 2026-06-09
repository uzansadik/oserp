import 'server-only';
import { randomBytes } from 'node:crypto';

import type { EnvSpecField } from './catalog';

export function generateSecret(kind: NonNullable<EnvSpecField['generate']>): string {
  switch (kind) {
    case 'password':
      return randomBytes(18).toString('base64url');
    case 'secret-hex':
      return randomBytes(32).toString('hex');
    case 'secret-base64':
      return randomBytes(48).toString('base64url');
  }
}

export function resolveEnvForEntry(
  spec: readonly EnvSpecField[],
  userInput: Record<string, string>,
  existingEnv: Record<string, string> = {},
): { env: Record<string, string>; generated: string[] } {
  const env: Record<string, string> = {};
  const generated: string[] = [];

  for (const field of spec) {
    const fromUser = userInput[field.key];
    const fromExisting = existingEnv[field.key];

    if (typeof fromUser === 'string' && fromUser.length > 0) {
      env[field.key] = fromUser;
      continue;
    }
    if (typeof fromExisting === 'string' && fromExisting.length > 0) {
      env[field.key] = fromExisting;
      continue;
    }
    if (field.generate) {
      const value = generateSecret(field.generate);
      env[field.key] = value;
      generated.push(field.key);
      continue;
    }
    if (field.default !== undefined) {
      env[field.key] = field.default;
      continue;
    }
    if (!field.optional) {
      throw new Error(`Zorunlu env eksik: ${field.key}`);
    }
  }

  return { env, generated };
}
