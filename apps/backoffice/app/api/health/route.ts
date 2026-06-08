import { NextResponse } from 'next/server';

import { getContext, resolveDbPath } from '@/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getContext();
  const adminCount = await ctx.adminUsers.count();
  const serviceCount = (await ctx.services.list()).length;

  return NextResponse.json({
    status: 'ok',
    db: {
      path: resolveDbPath(),
      adminCount,
      serviceCount,
    },
    uptime: process.uptime(),
  });
}
