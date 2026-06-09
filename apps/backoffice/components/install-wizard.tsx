'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import { Badge } from '@oserp-community/ui/components/badge';
import { Button } from '@oserp-community/ui/components/button';
import { Input } from '@oserp-community/ui/components/input';
import { Label } from '@oserp-community/ui/components/label';
import { Separator } from '@oserp-community/ui/components/separator';

export type CatalogEntryView = {
  name: string;
  title: string;
  description: string;
  image: string;
  defaultTag: string;
  dependsOn: string[];
  envSpec: Array<{
    key: string;
    description?: string;
    default?: string;
    generated: boolean;
    optional: boolean;
  }>;
  ports: Record<string, number> | Record<number, number>;
  volumes: string[];
  postInstall: Array<{ kind: string; command: string[] }>;
};

type Props = { entries: CatalogEntryView[] };

type InstallReport = {
  target: string;
  order: string[];
  results: Array<{
    name: string;
    generated: string[];
    postInstall: Array<{ kind: string; exitCode: number; logsTail: string }>;
  }>;
};

export function InstallWizard({ entries }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(entries[0]?.name ?? null);
  const [tag, setTag] = useState<string>('');
  const [envByService, setEnvByService] = useState<Record<string, Record<string, string>>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InstallReport | null>(null);

  const entriesByName = useMemo(() => {
    const map = new Map<string, CatalogEntryView>();
    for (const e of entries) map.set(e.name, e);
    return map;
  }, [entries]);

  const selectedEntry = selected ? entriesByName.get(selected) ?? null : null;

  const installChain = useMemo(() => {
    if (!selectedEntry) return [] as CatalogEntryView[];
    const order: CatalogEntryView[] = [];
    const visited = new Set<string>();
    const walk = (name: string) => {
      if (visited.has(name)) return;
      const e = entriesByName.get(name);
      if (!e) return;
      for (const dep of e.dependsOn) walk(dep);
      visited.add(name);
      order.push(e);
    };
    walk(selectedEntry.name);
    return order;
  }, [selectedEntry, entriesByName]);

  function setEnvField(serviceName: string, key: string, value: string) {
    setEnvByService((prev) => ({
      ...prev,
      [serviceName]: { ...(prev[serviceName] ?? {}), [key]: value },
    }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedEntry) return;
    setError(null);
    setReport(null);
    setPending(true);
    try {
      const res = await fetch(`/api/catalog/${selectedEntry.name}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(tag.length > 0 ? { tag } : {}),
          envByService,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        report?: InstallReport;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.report) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setReport(data.report);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  if (entries.length === 0) {
    return (
      <Alert>
        <AlertTitle>Boş katalog</AlertTitle>
        <AlertDescription>Şu an için kurulabilecek bir şablon yok.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const active = entry.name === selected;
          return (
            <li key={entry.name}>
              <button
                type="button"
                onClick={() => {
                  setSelected(entry.name);
                  setTag('');
                  setReport(null);
                  setError(null);
                }}
                className={`group w-full rounded-md border p-3 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{entry.title}</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {entry.name}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {entry.description}
                </p>
                {entry.dependsOn.length > 0 ? (
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    Gereken: {entry.dependsOn.join(', ')}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex min-w-0 flex-col gap-4">
        {!selectedEntry ? (
          <Alert>
            <AlertTitle>Bir servis seç</AlertTitle>
            <AlertDescription>Soldan kurmak istediğin servisi seç.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">{selectedEntry.title}</h3>
              <p className="text-muted-foreground text-sm">
                <span className="font-mono">{selectedEntry.image}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tag">Tag (boş bırakılırsa default)</Label>
              <Input
                id="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder={selectedEntry.defaultTag}
              />
            </div>

            <Separator />

            <p className="text-muted-foreground text-xs">
              Kurulum sırası:{' '}
              <span className="font-mono">
                {installChain.map((e) => e.name).join(' → ')}
              </span>
            </p>

            <div className="flex flex-col gap-6">
              {installChain.map((entry) => (
                <div key={entry.name} className="border-border rounded-md border p-4">
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-medium">{entry.title}</h4>
                      <p className="text-muted-foreground text-xs font-mono">{entry.name}</p>
                    </div>
                    {entry.name !== selectedEntry.name ? (
                      <Badge variant="secondary" className="text-[10px]">bağımlılık</Badge>
                    ) : null}
                  </header>
                  {entry.envSpec.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Bu servis için ayar gerekmez.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {entry.envSpec.map((field) => {
                        const id = `env-${entry.name}-${field.key}`;
                        const value = envByService[entry.name]?.[field.key] ?? '';
                        return (
                          <div key={field.key} className="flex flex-col gap-1">
                            <Label htmlFor={id} className="flex items-center gap-2">
                              <span className="font-mono">{field.key}</span>
                              {field.generated ? (
                                <Badge variant="outline" className="text-[10px]">otomatik</Badge>
                              ) : null}
                              {field.optional ? (
                                <Badge variant="outline" className="text-[10px]">ops.</Badge>
                              ) : null}
                            </Label>
                            <Input
                              id={id}
                              value={value}
                              placeholder={
                                field.generated
                                  ? 'Boş bırak → otomatik üretilir'
                                  : field.default ?? ''
                              }
                              onChange={(e) =>
                                setEnvField(entry.name, field.key, e.target.value)
                              }
                            />
                            {field.description ? (
                              <p className="text-muted-foreground text-xs">{field.description}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Kurulum başarısız</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap break-all">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}

            {report ? (
              <Alert>
                <AlertTitle>Kurulum tamamlandı</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 flex flex-col gap-3">
                    {report.results.map((r) => (
                      <div key={r.name} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.name}</span>
                          {r.generated.length > 0 ? (
                            <Badge variant="secondary">
                              {r.generated.length} sır üretildi
                            </Badge>
                          ) : null}
                        </div>
                        {r.generated.length > 0 ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Üretilen: <span className="font-mono">{r.generated.join(', ')}</span>{' '}
                            — bu değerler güvenli olarak DB'de saklandı, detay sayfasında
                            maskeli olarak gösterilir.
                          </p>
                        ) : null}
                        {r.postInstall.length > 0 ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Post-install adımları: {r.postInstall.length} (tümü exit=0)
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? 'Kuruluyor...' : `${selectedEntry.title} kur`}
              </Button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
