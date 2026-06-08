import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { createSessionForUser, hashPassword } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SetupBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  let body: SetupBody;
  try {
    body = (await request.json()) as SetupBody;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON gövdesi.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Gecerli bir e-posta gerekli.' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Parola en az ${MIN_PASSWORD_LENGTH} karakter olmali.` },
      { status: 400 },
    );
  }

  const ctx = await getContext();
  const existingCount = await ctx.adminUsers.count();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: 'Kurulum sihirbazi zaten tamamlanmis.' },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await ctx.adminUsers.create({ email, passwordHash });
  await createSessionForUser(user.id);

  return NextResponse.json({ ok: true, redirect: '/' });
}
