import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const { name } = await params;
  const ctx = await getContext();
  const row = await ctx.services.findByName(name);
  if (!row) {
    return NextResponse.json({ error: 'Servis bulunamadi.' }, { status: 404 });
  }

  const docker = new DockerService();
  try {
    await docker.stopContainer(row.name, { ignoreMissing: true });
    await ctx.services.updateStatus(row.name, 'stopped');
    await ctx.services.recordEvent({
      serviceName: row.name,
      kind: 'stopped',
      payloadJson: JSON.stringify({ by: admin.email }),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.services.recordEvent({
      serviceName: row.name,
      kind: 'stop_failed',
      payloadJson: JSON.stringify({ by: admin.email, error: message }),
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
