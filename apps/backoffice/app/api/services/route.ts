import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService, type ContainerStatus } from '@/server/docker';
import type { ServiceRow } from '@/server/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ServiceListItem = ServiceRow & {
  container: ContainerStatus | null;
  containerError?: string;
};

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const ctx = await getContext();
  const rows = await ctx.services.list();
  const docker = new DockerService();

  const items: ServiceListItem[] = await Promise.all(
    rows.map(async (row) => {
      try {
        const container = await docker.getContainerStatus(row.name);
        return { ...row, container };
      } catch (err) {
        return {
          ...row,
          container: null,
          containerError: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return NextResponse.json({ services: items });
}
