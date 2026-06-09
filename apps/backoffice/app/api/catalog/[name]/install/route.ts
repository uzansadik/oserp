import { NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/server/auth';
import { getCatalogEntry } from '@/server/catalog';
import { InstallOrchestrator } from '@/server/install-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

type InstallBody = {
  tag?: unknown;
  env?: unknown;
  envByService?: unknown;
};

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const { name } = await params;
  const entry = getCatalogEntry(name);
  if (!entry) {
    return NextResponse.json({ error: 'Katalog girisi bulunamadi.' }, { status: 404 });
  }

  let body: InstallBody;
  try {
    body = (await request.json().catch(() => ({}))) as InstallBody;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON govdesi.' }, { status: 400 });
  }

  const tag = typeof body.tag === 'string' && body.tag.length > 0 ? body.tag : undefined;
  const envByService = mergeEnvByService(name, body);

  try {
    const orchestrator = await InstallOrchestrator.create();
    const report = await orchestrator.install({
      target: name,
      ...(tag ? { tag } : {}),
      ...(envByService ? { envByService } : {}),
      actorEmail: admin.email,
    });
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function mergeEnvByService(target: string, body: InstallBody): Record<string, Record<string, string>> | undefined {
  const out: Record<string, Record<string, string>> = {};
  if (body.env && typeof body.env === 'object' && !Array.isArray(body.env)) {
    out[target] = sanitize(body.env);
  }
  if (body.envByService && typeof body.envByService === 'object' && !Array.isArray(body.envByService)) {
    for (const [k, v] of Object.entries(body.envByService)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = { ...(out[k] ?? {}), ...sanitize(v) };
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitize(obj: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  return out;
}
