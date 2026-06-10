import { NextResponse } from 'next/server';

import { getCurrentAdmin } from '@/server/auth';
import { listCatalog } from '@/server/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }
  const entries = listCatalog().map((entry) => ({
    name: entry.name,
    title: entry.title,
    description: entry.description,
    image: entry.image,
    defaultTag: entry.defaultTag,
    dependsOn: entry.dependsOn,
    envSpec: entry.envSpec.map((field) => ({
      key: field.key,
      ...(field.description ? { description: field.description } : {}),
      ...(field.default ? { default: field.default } : {}),
      ...(field.generate ? { generated: true } : {}),
      ...(field.optional ? { optional: true } : {}),
    })),
    ports: entry.ports,
    volumes: entry.volumes,
    postInstall: entry.postInstall.map((s) => ({
      kind: s.kind,
      ...(s.kind === 'migrate' ? { command: s.command } : {}),
    })),
  }));
  return NextResponse.json({ entries });
}
