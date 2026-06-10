import { NextResponse } from 'next/server';

import { getContext } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService } from '@/server/docker';
import {
  EDGE_CONTAINER_NAME,
  EdgeManager,
  isEdgeEnabled,
  normalizeAcmeEmail,
  normalizeDomain,
  normalizeTlsMode,
} from '@/server/edge';
import type { EdgeConfigRow } from '@/server/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });

  const ctx = await getContext();
  const cfg = await ctx.edgeConfig.get();
  const docker = new DockerService();
  let container: Awaited<ReturnType<DockerService['getContainerStatus']>> | null = null;
  let containerError: string | null = null;
  try {
    container = await docker.getContainerStatus(EDGE_CONTAINER_NAME);
  } catch (err) {
    containerError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    enabled: isEdgeEnabled(),
    config: serializeConfig(cfg),
    container,
    ...(containerError ? { containerError } : {}),
  });
}

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });

  let body: { domain?: unknown; tlsMode?: unknown; acmeEmail?: unknown };
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
  const acmeEmail = normalizeAcmeEmail(body.acmeEmail);
  if (acmeEmail === 'INVALID') {
    return NextResponse.json({ error: 'Gecersiz acmeEmail.' }, { status: 400 });
  }

  const ctx = await getContext();
  const current = await ctx.edgeConfig.get();
  const effectiveDomain = domain !== undefined ? domain : current.domain;
  const effectiveTls = tlsMode ?? current.tlsMode;
  const effectiveEmail = acmeEmail !== undefined ? acmeEmail : current.acmeEmail;

  if (effectiveTls === 'auto' && !effectiveDomain) {
    return NextResponse.json({ error: "tlsMode='auto' icin domain gerekli." }, { status: 400 });
  }
  if (effectiveTls === 'auto' && !effectiveEmail) {
    return NextResponse.json(
      { error: "tlsMode='auto' icin acmeEmail gerekli (Let's Encrypt)." },
      { status: 400 },
    );
  }

  const updated = await ctx.edgeConfig.update({
    ...(domain !== undefined ? { domain } : {}),
    ...(tlsMode !== undefined ? { tlsMode } : {}),
    ...(acmeEmail !== undefined ? { acmeEmail } : {}),
  });

  if (isEdgeEnabled()) {
    try {
      const edge = await EdgeManager.create();
      await edge.sync();
    } catch (err) {
      return NextResponse.json({
        ok: true,
        config: serializeConfig(updated),
        warning: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, config: serializeConfig(updated) });
}

function serializeConfig(row: EdgeConfigRow) {
  return {
    domain: row.domain,
    tlsMode: row.tlsMode,
    acmeEmail: row.acmeEmail,
    updatedAt: row.updatedAt,
  };
}
