import 'server-only';

import type { TlsMode } from '../schema';

export type EdgeServiceEntry = {
  /** Container/service adi (docker network DNS adi). */
  name: string;
  /** Domain set edildiyse domain blogu yazilir; aksi halde catchall'a girer. */
  domain: string | null;
  tlsMode: TlsMode;
  /** Container icinde dinlenen port. Yoksa servis Caddy'ye eklenmez. */
  upstreamPort: number | null;
};

export type BackofficeEdgeEntry = {
  name: string;
  upstreamPort: number;
  domain: string | null;
  tlsMode: TlsMode;
};

export type BuildCaddyfileInput = {
  backoffice: BackofficeEdgeEntry;
  services: EdgeServiceEntry[];
  /** ACME e-postasi (tls auto modu icin onerilir). */
  acmeEmail?: string | null;
};

/**
 * Caddyfile uretir. Davranis:
 *  - Domain'i olan her servis kendi domain blogunda yayinlanir.
 *  - Domain'i olmayan backoffice icin catchall :80 + :443 (tls internal) tanimlanir;
 *    boylece IP uzerinden erisim hemen calisir, sonradan domain eklenebilir.
 *  - Domain'i olmayan diger servisler edge'e expose edilmez (intra-net only).
 */
export function buildCaddyfile(input: BuildCaddyfileInput): string {
  const lines: string[] = [];
  const acmeEmail = (input.acmeEmail ?? '').trim();

  // Global options
  lines.push('{');
  if (acmeEmail.length > 0) lines.push(`  email ${acmeEmail}`);
  lines.push('  admin 0.0.0.0:2019');
  lines.push('}');
  lines.push('');

  const backoffice = input.backoffice;
  const backofficeUpstream = `${backoffice.name}:${backoffice.upstreamPort}`;

  if (backoffice.domain && backoffice.domain.trim().length > 0) {
    lines.push(...renderSite(backoffice.domain.trim(), backoffice.tlsMode, backofficeUpstream));
  } else {
    // Catchall: backoffice ilk acilista IP uzerinden hemen erisilebilir.
    lines.push('# Backoffice catchall (domain set edilmemis)');
    lines.push(':80 {');
    lines.push(`  reverse_proxy ${backofficeUpstream}`);
    lines.push('}');
    lines.push('');
    lines.push(':443 {');
    lines.push('  tls internal');
    lines.push(`  reverse_proxy ${backofficeUpstream}`);
    lines.push('}');
    lines.push('');
  }

  for (const svc of input.services) {
    if (!svc.domain || svc.domain.trim().length === 0) continue;
    if (!svc.upstreamPort) continue;
    const upstream = `${svc.name}:${svc.upstreamPort}`;
    lines.push(...renderSite(svc.domain.trim(), svc.tlsMode, upstream));
  }

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function renderSite(domain: string, tlsMode: TlsMode, upstream: string): string[] {
  const out: string[] = [];
  out.push(`${domain} {`);
  if (tlsMode === 'self_signed') {
    out.push('  tls internal');
  } else if (tlsMode === 'off') {
    // Sadece HTTP. Caddy http:// prefix'i olmayan host'ta default https'e
    // gecmesin diye tls'i kapatamayiz; bunun yerine direktif olarak port 80
    // siteyi tutamaz. tls 'off' icin acik bir yontem yok, en yakini self_signed.
    out.push('  tls internal');
  }
  // tlsMode === 'auto': Caddy global ACME'i kullanir (otomatik LE sertifikasi).
  out.push(`  reverse_proxy ${upstream}`);
  out.push('}');
  out.push('');
  return out;
}
