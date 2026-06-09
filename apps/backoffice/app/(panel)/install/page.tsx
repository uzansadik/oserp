import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@oserp-community/ui/components/card';

import { InstallWizard } from '@/components/install-wizard';
import { listCatalog } from '@/server/catalog';

export const dynamic = 'force-dynamic';

export default function InstallPage() {
  const entries = listCatalog().map((entry) => ({
    name: entry.name,
    title: entry.title,
    description: entry.description,
    image: entry.image,
    defaultTag: entry.defaultTag,
    dependsOn: entry.dependsOn,
    envSpec: entry.envSpec.map((f) => ({
      key: f.key,
      ...(f.description ? { description: f.description } : {}),
      ...(f.default ? { default: f.default } : {}),
      ...(f.generate ? { generated: true } : { generated: false }),
      ...(f.optional ? { optional: true } : { optional: false }),
    })),
    ports: entry.ports,
    volumes: entry.volumes,
    postInstall: entry.postInstall.map((s) => ({ kind: s.kind, command: s.command })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Servis Kur</h1>
        <p className="text-muted-foreground text-sm">
          Katalogdan bir servis seç, gerekli ayarları gir ve kur. Bağımlılıklar
          (örn. <span className="font-mono">postgres</span>) ve sırlar otomatik
          olarak çözülür.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
          <CardDescription>
            {entries.length} hazır şablon bulundu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstallWizard entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
