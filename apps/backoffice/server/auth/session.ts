import 'server-only';
import { randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';

import type { AdminUserRow } from '../schema';
import { getContext } from '../index';

export const SESSION_COOKIE = 'bo_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
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
  jar.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
  return token;
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) {
    const ctx = await getContext();
    await ctx.sessions.deleteByToken(existing);
  }
  jar.set(SESSION_COOKIE, '', cookieOptions(0));
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
