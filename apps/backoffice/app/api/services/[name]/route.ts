import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
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
    const container = await docker.getContainerStatus(row.name);
    return NextResponse.json({ service: row, container });
  } catch (err) {
    return NextResponse.json(
      {
        service: row,
        container: null,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
