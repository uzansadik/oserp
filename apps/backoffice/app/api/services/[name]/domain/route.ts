import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { getCatalogEntry } from '@/server/catalog';
import {
  EdgeManager,
  isEdgeEnabled,
  normalizeDomain,
  normalizeTlsMode,
  normalizeUpstreamPort,
} from '@/server/edge';
import type { TlsMode } from '@/server/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ name: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });

  const { name } = await params;
  const ctx = await getContext();
  const row = await ctx.services.findByName(name);
  if (!row) return NextResponse.json({ error: 'Servis bulunamadi.' }, { status: 404 });

  let body: { domain?: unknown; tlsMode?: unknown; upstreamPort?: unknown };
  try {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON govdesi.' }, { status: 400 });
  }

  const domain = normalizeDomain(body.domain);
  if (domain === 'INVALID') {
    return NextResponse.json({ error: 'Gecersiz domain.' }, { status: 400 });
  }
  const tlsMode = normalizeTlsMode(body.tlsMode);
  if (tlsMode === 'INVALID') {
    return NextResponse.json({ error: 'Gecersiz tlsMode.' }, { status: 400 });
  }
  const upstreamPort = normalizeUpstreamPort(body.upstreamPort);
  if (upstreamPort === 'INVALID') {
    return NextResponse.json({ error: 'Gecersiz upstreamPort.' }, { status: 400 });
  }

  const catalogEntry = getCatalogEntry(name);
  const resolvedUpstream =
    upstreamPort !== undefined
      ? upstreamPort
      : (row.upstreamPort ?? catalogEntry?.upstreamPort ?? null);

  const effectiveDomain = domain !== undefined ? domain : row.domain;
  const effectiveTls: TlsMode = tlsMode ?? row.tlsMode;

  if (effectiveDomain && !resolvedUpstream) {
    return NextResponse.json(
      { error: 'Domain icin upstreamPort gerekli (servis hangi portu dinler?).' },
      { status: 400 },
    );
  }
  if (effectiveTls === 'auto' && !effectiveDomain) {
    return NextResponse.json({ error: "tlsMode='auto' icin domain gerekli." }, { status: 400 });
  }

  await ctx.services.setDomain(name, {
    domain: effectiveDomain,
    tlsMode: effectiveTls,
    upstreamPort: resolvedUpstream,
  });

  await ctx.services.recordEvent({
    serviceName: name,
    kind: 'domain_updated',
    payloadJson: JSON.stringify({
      by: admin.email,
      domain: effectiveDomain,
      tlsMode: effectiveTls,
      upstreamPort: resolvedUpstream,
    }),
  });

  if (isEdgeEnabled()) {
    try {
      const edge = await EdgeManager.create();
      await edge.sync();
    } catch (err) {
      return NextResponse.json({
        ok: true,
        warning: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
