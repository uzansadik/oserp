import { NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/server/auth';
import { EdgeManager, isEdgeEnabled } from '@/server/edge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  if (!isEdgeEnabled()) {
    return NextResponse.json({ error: 'Edge devre disi (EDGE_ENABLED=0).' }, { status: 409 });
  }

  try {
    const edge = await EdgeManager.create();
    const result = await edge.sync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
