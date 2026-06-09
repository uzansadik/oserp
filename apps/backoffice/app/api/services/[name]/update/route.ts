import { NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/server/auth';
import { InstallOrchestrator } from '@/server/install-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

type UpdateBody = { tag?: unknown };

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const { name } = await params;

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON govdesi.' }, { status: 400 });
  }

  const tag = typeof body.tag === 'string' ? body.tag.trim() : '';
  if (tag.length === 0) {
    return NextResponse.json({ error: 'tag alani zorunlu.' }, { status: 400 });
  }

  try {
    const orchestrator = await InstallOrchestrator.create();
    await orchestrator.update(name, tag, admin.email);
    return NextResponse.json({ ok: true, name, tag });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('kayitli degil') ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
