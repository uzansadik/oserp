import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { createSessionForUser, verifyPassword } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON gövdesi.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (email.length === 0 || password.length === 0) {
    return NextResponse.json(
      { error: 'E-posta ve parola gerekli.' },
      { status: 400 },
    );
  }

  const ctx = await getContext();
  const user = await ctx.adminUsers.findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'Hatali kimlik bilgileri.' }, { status: 401 });
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    return NextResponse.json({ error: 'Hatali kimlik bilgileri.' }, { status: 401 });
  }

  await createSessionForUser(user.id);
  return NextResponse.json({ ok: true, redirect: '/' });
}
