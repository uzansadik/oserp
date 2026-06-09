import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';

import { getContext, resolveDbPath } from '@/server';
import { getCurrentAdmin } from '@/server/auth';
import { DockerService, resolveDockerHost } from '@/server/docker';
import { NETWORK_NAME } from '@/server/catalog';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await getCurrentAdmin();
  const ctx = await getContext();
  const adminCount = await ctx.adminUsers.count();
  const docker = new DockerService();
  const daemon = await docker.pingDaemon();
  const dockerHost = resolveDockerHost();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <p className="text-muted-foreground text-sm">
          Backoffice çalışma zamanı ve ortam bilgileri.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Oturum</CardTitle>
            <CardDescription>Aktif yönetici.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              E-posta: <span className="font-mono">{admin?.email ?? '—'}</span>
            </p>
            <p className="text-muted-foreground mt-1">
              Toplam yönetici: {adminCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Veritabanı</CardTitle>
            <CardDescription>SQLite (libsql) bağlantısı.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-mono break-all">{resolveDbPath()}</p>
            <p className="text-muted-foreground mt-1">
              Yolu değiştirmek için <span className="font-mono">BACKOFFICE_DB_PATH</span> env'i.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Docker</CardTitle>
            <CardDescription>Daemon bağlantısı ve ağ.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Soket:{' '}
              <span className="font-mono">
                {dockerHost.socketPath ?? `${dockerHost.host}:${dockerHost.port}`}
              </span>
            </p>
            <p>
              Yönetilen ağ: <span className="font-mono">{NETWORK_NAME}</span>
            </p>
            {daemon.reachable ? (
              <>
                <p>
                  Sürüm: <span className="font-mono">{daemon.version ?? '?'}</span>{' '}
                  (API {daemon.apiVersion ?? '?'})
                </p>
                <p>
                  Host: <span className="font-mono">{daemon.os ?? '?'} / {daemon.arch ?? '?'}</span>
                </p>
                <p className="text-muted-foreground">
                  Container: {daemon.containers ?? 0} • Imaj: {daemon.images ?? 0}
                </p>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTitle>Daemon erişilemiyor</AlertTitle>
                <AlertDescription>{daemon.error ?? 'Bilinmeyen hata.'}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Çalışma zamanı</CardTitle>
            <CardDescription>Node ve port.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Node: <span className="font-mono">{process.version}</span>
            </p>
            <p>
              Platform:{' '}
              <span className="font-mono">
                {process.platform}/{process.arch}
              </span>
            </p>
            <p>
              Mod: <span className="font-mono">{process.env.NODE_ENV}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
