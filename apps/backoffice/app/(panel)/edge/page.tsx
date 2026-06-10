import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import { Badge } from '@oserp-community/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';

import { EdgeForm, type EdgeServiceView } from '@/components/edge-form';
import { getContext } from '@/server';
import { getCatalogEntry } from '@/server/catalog';
import { DockerService } from '@/server/docker';
import { EDGE_CONTAINER_NAME, isEdgeEnabled } from '@/server/edge';

export const dynamic = 'force-dynamic';

export default async function EdgePage() {
  const ctx = await getContext();
  const edgeCfg = await ctx.edgeConfig.get();
  const rows = await ctx.services.list();
  const docker = new DockerService();
  let status: Awaited<ReturnType<DockerService['getContainerStatus']>> | null = null;
  let statusError: string | null = null;
  try {
    status = await docker.getContainerStatus(EDGE_CONTAINER_NAME);
  } catch (err) {
    statusError = err instanceof Error ? err.message : String(err);
  }

  const services: EdgeServiceView[] = rows.map((row) => {
    const catalogEntry = getCatalogEntry(row.name);
    return {
      name: row.name,
      title: catalogEntry?.title ?? row.name,
      domain: row.domain,
      tlsMode: row.tlsMode,
      upstreamPort: row.upstreamPort ?? catalogEntry?.upstreamPort ?? null,
      catalogUpstream: catalogEntry?.upstreamPort ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Etki Alanları & TLS</h1>
        <p className="text-muted-foreground text-sm">
          Backoffice ve servisleriniz için domain ve sertifika ayarları. Tüm trafik{' '}
          <span className="font-mono">oserp-edge</span> (Caddy) container'ı üzerinden geçer.
        </p>
      </header>

      {!isEdgeEnabled() ? (
        <Alert variant="destructive">
          <AlertTitle>Edge devre dışı</AlertTitle>
          <AlertDescription>
            <span className="font-mono">EDGE_ENABLED=0</span> ile başlatılmış. SSL ve domain
            özellikleri çalışmaz; backoffice doğrudan host portu üzerinden yayınlanır.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Edge container</CardTitle>
          <CardDescription>
            Caddy 2 — <span className="font-mono">{EDGE_CONTAINER_NAME}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          {statusError ? (
            <Alert variant="destructive">
              <AlertTitle>Docker daemon erişilemiyor</AlertTitle>
              <AlertDescription className="break-all">{statusError}</AlertDescription>
            </Alert>
          ) : status?.exists ? (
            <>
              <Badge variant={status.running ? 'default' : 'destructive'}>
                {status.running ? 'çalışıyor' : (status.status ?? 'durdu')}
              </Badge>
              <span className="text-muted-foreground font-mono text-xs">{status.image ?? '?'}</span>
              <span className="text-muted-foreground">
                {status.ports
                  .map((p) => `${p.host ?? '?'}→${p.container}/${p.protocol}`)
                  .join(' • ') || '—'}
              </span>
            </>
          ) : (
            <Alert>
              <AlertTitle>Edge container yok</AlertTitle>
              <AlertDescription>
                İlk değişiklikte otomatik olarak ayağa kalkacak. Manuel tetiklemek için aşağıdan
                kaydet veya <span className="font-mono">/api/edge/reload</span>'a POST atın.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <EdgeForm
        edge={{
          domain: edgeCfg.domain,
          tlsMode: edgeCfg.tlsMode,
          acmeEmail: edgeCfg.acmeEmail,
        }}
        services={services}
      />
    </div>
  );
}
