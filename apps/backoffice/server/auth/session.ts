import 'server-only';
import { randomBytes } from 'node:crypto';

import { cookies, headers } from 'next/headers';
import { getContext } from '../index';
import type { AdminUserRow } from '../schema';

export const SESSION_COOKIE = 'bo_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Mevcut isteğin HTTPS üzerinden mi geldiğini belirler.
 *
 * Karar sırası:
 *   1. `BACKOFFICE_COOKIE_SECURE` env değeri "1" ise her zaman Secure.
 *      "0" ise asla Secure (lokal HTTP geliştirme için).
 *   2. `X-Forwarded-Proto: https` header'ı (reverse proxy arkasında).
 *   3. `NODE_ENV=production` ise varsayılan olarak Secure (güvenli tarafta kal).
 *   4. Aksi halde Secure değil.
 */
async function isSecureRequest(): Promise<boolean> {
  const override = process.env.BACKOFFICE_COOKIE_SECURE;
  if (override === '1') return true;
  if (override === '0') return false;

  const h = await headers();
  const xfp = h.get('x-forwarded-proto');
  if (xfp) {
    // "https, http" gibi virgüllü değerlerde ilkini al
    const first = xfp.split(',')[0]?.trim().toLowerCase();
    if (first === 'https') return true;
    if (first === 'http') return false;
  }

  return process.env.NODE_ENV === 'production';
}

function cookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function createSessionForUser(userId: number): Promise<string> {
  const ctx = await getContext();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await ctx.sessions.create({ token, userId, expiresAt });
  const jar = await cookies();
  const secure = await isSecureRequest();
  jar.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000), secure));
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) {
    const ctx = await getContext();
    await ctx.sessions.deleteByToken(existing);
  }
  const secure = await isSecureRequest();
  jar.set(SESSION_COOKIE, '', cookieOptions(0, secure));
}

export async function getCurrentAdmin(): Promise<AdminUserRow | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const ctx = await getContext();
  const session = await ctx.sessions.findActiveByToken(token, new Date());
  if (!session) return null;
  return ctx.adminUsers.findById(session.userId);
}
