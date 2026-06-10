'use client';

import { Alert, AlertDescription, AlertTitle } from '@oserp-community/ui/components/alert';
import { Badge } from '@oserp-community/ui/components/badge';
import { Button } from '@oserp-community/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@oserp-community/ui/components/card';
import { Input } from '@oserp-community/ui/components/input';
import { Label } from '@oserp-community/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@oserp-community/ui/components/select';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export type TlsModeOption = 'off' | 'auto' | 'self_signed';

export type EdgeServiceView = {
  name: string;
  title: string;
  domain: string | null;
  tlsMode: TlsModeOption;
  upstreamPort: number | null;
  catalogUpstream: number | null;
};

type Props = {
  edge: {
    domain: string | null;
    tlsMode: TlsModeOption;
    acmeEmail: string | null;
  };
  services: EdgeServiceView[];
};

type FormState = {
  domain: string;
  tlsMode: TlsModeOption;
  acmeEmail: string;
  pending: boolean;
  error: string | null;
  ok: string | null;
};

type ServiceFormState = {
  domain: string;
  tlsMode: TlsModeOption;
  upstreamPort: string;
  pending: boolean;
  error: string | null;
  ok: string | null;
};

export function EdgeForm(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <BackofficeCard edge={props.edge} />
      <Card>
        <CardHeader>
          <CardTitle>Servisler</CardTitle>
          <CardDescription>
            Her servise kendi domain'i veya alt domain'i atayabilirsiniz. Boş bırakılırsa servis
            yalnızca internal Docker ağında kalır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {props.services.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Henüz kurulu servis yok. Önce <span className="font-mono">Servis Kur</span>'dan bir
              servis ekleyin.
            </p>
          ) : (
            props.services.map((svc) => <ServiceRow key={svc.name} service={svc} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BackofficeCard({ edge }: { edge: Props['edge'] }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    domain: edge.domain ?? '',
    tlsMode: edge.tlsMode,
    acmeEmail: edge.acmeEmail ?? '',
    pending: false,
    error: null,
    ok: null,
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState((s) => ({ ...s, pending: true, error: null, ok: null }));
    try {
      const res = await fetch('/api/edge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: state.domain.trim().length === 0 ? null : state.domain.trim(),
          tlsMode: state.tlsMode,
          acmeEmail: state.acmeEmail.trim().length === 0 ? null : state.acmeEmail.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setState((s) => ({
        ...s,
        pending: false,
        ok: data.warning ? `Kaydedildi. Uyarı: ${data.warning}` : 'Kaydedildi.',
      }));
      router.refresh();
    } catch (err) {
      setState((s) => ({
        ...s,
        pending: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backoffice</CardTitle>
        <CardDescription>
          Yönetim panelinin kendi domain'i. Boş bırakılırsa Caddy IP üzerinden self-signed sertifika
          ile yayın yapar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="bo-domain">Domain</Label>
              <Input
                id="bo-domain"
                placeholder="ornek: panel.example.com"
                value={state.domain}
                onChange={(e) => setState((s) => ({ ...s, domain: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="bo-tls">TLS</Label>
              <Select
                value={state.tlsMode}
                onValueChange={(value) =>
                  setState((s) => ({ ...s, tlsMode: value as TlsModeOption }))
                }
              >
                <SelectTrigger id="bo-tls">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self_signed">Self-signed (Caddy internal)</SelectItem>
                  <SelectItem value="auto">Let's Encrypt (otomatik)</SelectItem>
                  <SelectItem value="off">HTTP yok / TLS yok (önerilmez)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <Label htmlFor="bo-email">
                ACME e-posta{' '}
                <span className="text-muted-foreground text-xs">(Let's Encrypt için)</span>
              </Label>
              <Input
                id="bo-email"
                type="email"
                placeholder="admin@example.com"
                value={state.acmeEmail}
                onChange={(e) => setState((s) => ({ ...s, acmeEmail: e.target.value }))}
              />
            </div>
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Hata</AlertTitle>
              <AlertDescription className="break-all">{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.ok ? (
            <Alert>
              <AlertTitle>Tamam</AlertTitle>
              <AlertDescription>{state.ok}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={state.pending}>
              {state.pending ? 'Kaydediliyor...' : 'Backoffice ayarlarını kaydet'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ServiceRow({ service }: { service: EdgeServiceView }) {
  const router = useRouter();
  const [state, setState] = useState<ServiceFormState>({
    domain: service.domain ?? '',
    tlsMode: service.tlsMode,
    upstreamPort: String(service.upstreamPort ?? service.catalogUpstream ?? ''),
    pending: false,
    error: null,
    ok: null,
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState((s) => ({ ...s, pending: true, error: null, ok: null }));
    try {
      const upstream = state.upstreamPort.trim();
      const res = await fetch(`/api/services/${encodeURIComponent(service.name)}/domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: state.domain.trim().length === 0 ? null : state.domain.trim(),
          tlsMode: state.tlsMode,
          ...(upstream.length > 0 ? { upstreamPort: upstream } : { upstreamPort: null }),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        warning?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setState((s) => ({
        ...s,
        pending: false,
        ok: data.warning ? `Kaydedildi. Uyarı: ${data.warning}` : 'Kaydedildi.',
      }));
      router.refresh();
    } catch (err) {
      setState((s) => ({
        ...s,
        pending: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-border flex flex-col gap-3 rounded-md border p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{service.title}</h3>
          <p className="text-muted-foreground text-xs font-mono">{service.name}</p>
        </div>
        {service.domain ? (
          <Badge variant="default" className="font-mono text-[10px]">
            {service.domain}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            internal
          </Badge>
        )}
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1 md:col-span-2">
          <Label htmlFor={`svc-domain-${service.name}`}>Domain</Label>
          <Input
            id={`svc-domain-${service.name}`}
            placeholder="ornek: api.example.com"
            value={state.domain}
            onChange={(e) => setState((s) => ({ ...s, domain: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`svc-tls-${service.name}`}>TLS</Label>
          <Select
            value={state.tlsMode}
            onValueChange={(value) => setState((s) => ({ ...s, tlsMode: value as TlsModeOption }))}
          >
            <SelectTrigger id={`svc-tls-${service.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self_signed">Self-signed</SelectItem>
              <SelectItem value="auto">Let's Encrypt</SelectItem>
              <SelectItem value="off">Yok</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`svc-port-${service.name}`}>
            Upstream port{' '}
            {service.catalogUpstream !== null ? (
              <span className="text-muted-foreground text-xs">
                (katalog: {service.catalogUpstream})
              </span>
            ) : null}
          </Label>
          <Input
            id={`svc-port-${service.name}`}
            inputMode="numeric"
            placeholder={service.catalogUpstream ? String(service.catalogUpstream) : '3000'}
            value={state.upstreamPort}
            onChange={(e) => setState((s) => ({ ...s, upstreamPort: e.target.value }))}
          />
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription className="break-all">{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.ok ? (
        <Alert>
          <AlertTitle>Tamam</AlertTitle>
          <AlertDescription>{state.ok}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={state.pending}>
          {state.pending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}
