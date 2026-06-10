import 'server-only';

import type { TlsMode } from '../schema';

const VALID_TLS_MODES: TlsMode[] = ['off', 'auto', 'self_signed'];

export type Normalized<T> = T | undefined | 'INVALID';

export function normalizeDomain(input: unknown): Normalized<string | null> {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') return 'INVALID';
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    return 'INVALID';
  }
  return trimmed.toLowerCase();
}

export function normalizeTlsMode(input: unknown): Normalized<TlsMode> {
  if (input === undefined) return undefined;
  if (typeof input !== 'string') return 'INVALID';
  if (!VALID_TLS_MODES.includes(input as TlsMode)) return 'INVALID';
  return input as TlsMode;
}

export function normalizeAcmeEmail(input: unknown): Normalized<string | null> {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') return 'INVALID';
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return 'INVALID';
  return trimmed.toLowerCase();
}

export function normalizeUpstreamPort(input: unknown): Normalized<number | null> {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input === 'string') {
    if (input.trim().length === 0) return null;
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return 'INVALID';
    return n;
  }
  if (typeof input === 'number') {
    if (!Number.isInteger(input) || input < 1 || input > 65535) return 'INVALID';
    return input;
  }
  return 'INVALID';
}
