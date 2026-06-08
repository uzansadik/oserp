import { NextResponse } from 'next/server';

import { destroyCurrentSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true, redirect: '/login' });
}
