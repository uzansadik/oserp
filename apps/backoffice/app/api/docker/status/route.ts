import { NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const docker = new DockerService();
  const info = await docker.pingDaemon();
  return NextResponse.json(info, { status: info.reachable ? 200 : 503 });
}
