import 'server-only';

export {
  type BackofficeEdgeEntry,
  type BuildCaddyfileInput,
  buildCaddyfile,
  type EdgeServiceEntry,
} from './caddy-config';
export {
  BACKOFFICE_INTERNAL_PORT,
  caddyConfigDirOnHost,
  caddyDataPathOnHost,
  caddyfilePathOnHost,
  EDGE_CONTAINER_NAME,
  EDGE_IMAGE,
  EDGE_TAG,
  EdgeManager,
  isEdgeEnabled,
} from './edge-manager';
export {
  type Normalized,
  normalizeAcmeEmail,
  normalizeDomain,
  normalizeTlsMode,
  normalizeUpstreamPort,
} from './validation';
