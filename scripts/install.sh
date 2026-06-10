#!/usr/bin/env bash
#
# Oserp Community - Ubuntu LTS Backoffice kurulum script'i
#
# Bu script bir Ubuntu LTS sunucusunda asagidakileri yapar:
#   1. Sistemi gunceller (apt update/upgrade)
#   2. Temel guvenlik ayarlarini uygular (ufw, fail2ban, otomatik guvenlik
#      guncellemeleri)
#   3. Docker Engine + Compose eklentisini resmi depodan kurar
#   4. GHCR'den oserp-backoffice imajini ceker ve oserp-edge (Caddy) ile
#      birlikte ayaga kaldirir. Edge :80 ve :443 portlarini host'a yayinlar,
#      backoffice yalnizca dahili agdan erisilebilir.
#
# Tum dahili servisleri (postgres, iam api, vb.) backoffice tarayicidan
# yonetir; bu script repo klonlamaz, .env uretmez, compose calistirmaz.
#
# Kullanim (root veya sudo ile):
#   sudo bash install.sh
#   # veya
#   curl -fsSL https://raw.githubusercontent.com/uzansadik/oserp/main/scripts/install.sh | sudo bash
#
# Opsiyonel ortam degiskenleri:
#   IMAGE             (vars: ghcr.io/uzansadik/oserp-backoffice:latest)
#   CONTAINER_NAME    (vars: oserp-backoffice)
#   DATA_DIR          (vars: /var/lib/oserp-backoffice) Backoffice SQLite + state
#   EDGE_ENABLED      (vars: 1) 0 ise Caddy kurulmaz, backoffice host portuna acilir
#   EDGE_CONTAINER    (vars: oserp-edge)
#   EDGE_IMAGE        (vars: caddy:2-alpine)
#   LEGACY_PORT       (vars: 8000) EDGE_ENABLED=0 iken host portu
#   SSH_PORT          (vars: 22)   ufw'da izin verilecek SSH portu
#   DOCKER_NETWORK    (vars: oserp-net) Yonetilen servislerin paylasacagi ag
#   SKIP_SYSTEM       (vars: 0)    1 ise apt update/upgrade + guvenlik atlanir
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Yardimci fonksiyonlar
# ---------------------------------------------------------------------------
log()  { printf '\033[1;32m[+]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    err "Bu script root yetkisi gerektirir. 'sudo' ile calistirin."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Yapilandirma
# ---------------------------------------------------------------------------
IMAGE="${IMAGE:-ghcr.io/uzansadik/oserp-backoffice:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-oserp-backoffice}"
DATA_DIR="${DATA_DIR:-/var/lib/oserp-backoffice}"
EDGE_ENABLED="${EDGE_ENABLED:-1}"
EDGE_CONTAINER="${EDGE_CONTAINER:-oserp-edge}"
EDGE_IMAGE="${EDGE_IMAGE:-caddy:2-alpine}"
LEGACY_PORT="${LEGACY_PORT:-8000}"
SSH_PORT="${SSH_PORT:-22}"
DOCKER_NETWORK="${DOCKER_NETWORK:-oserp-net}"
SKIP_SYSTEM="${SKIP_SYSTEM:-0}"

# ---------------------------------------------------------------------------
# 0. On kontroller
# ---------------------------------------------------------------------------
require_root

if ! grep -qi 'ubuntu' /etc/os-release 2>/dev/null; then
  warn "Bu script Ubuntu LTS icin tasarlandi. Farkli bir dagitim tespit edildi; devam ediliyor."
fi

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
# 1. Sistem ve guvenlik (opsiyonel)
# ---------------------------------------------------------------------------
if [[ "${SKIP_SYSTEM}" != "1" ]]; then
  log "Sistem paketleri guncelleniyor..."
  apt-get update -y
  apt-get upgrade -y

  log "Temel araclar kuruluyor..."
  apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg ufw fail2ban unattended-upgrades

  log "Guvenlik duvari (ufw) yapilandiriliyor..."
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow "${SSH_PORT}/tcp" comment 'SSH'
  if [[ "${EDGE_ENABLED}" == "1" ]]; then
    ufw allow 80/tcp  comment 'HTTP (Caddy / ACME)'
    ufw allow 443/tcp comment 'HTTPS (Caddy)'
  else
    ufw allow "${LEGACY_PORT}/tcp" comment 'Oserp Backoffice (legacy)'
  fi
  ufw --force enable
  ufw status verbose || true

  log "Otomatik guvenlik guncellemeleri etkinlestiriliyor..."
  dpkg-reconfigure -f noninteractive unattended-upgrades || true
  systemctl enable --now unattended-upgrades || true

  log "fail2ban (SSH koruma) etkinlestiriliyor..."
  systemctl enable --now fail2ban || true
else
  log "SKIP_SYSTEM=1 -> apt/guvenlik adimlari atlandi."
fi

# ---------------------------------------------------------------------------
# 2. Docker kurulumu (resmi Docker apt deposu)
# ---------------------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker zaten kurulu: $(docker --version)"
else
  log "Docker Engine kuruluyor..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
  log "Docker kuruldu: $(docker --version)"
fi

# Root olmayan kullanici varsa docker grubuna ekle (SUDO_USER)
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod -aG docker "${SUDO_USER}" || true
  log "Kullanici '${SUDO_USER}' docker grubuna eklendi (yeniden oturum acmasi gerekir)."
fi

# ---------------------------------------------------------------------------
# 3. Veri dizini ve docker ag
# ---------------------------------------------------------------------------
log "Veri dizini hazirlaniyor: ${DATA_DIR}"
mkdir -p "${DATA_DIR}"
chmod 700 "${DATA_DIR}"
# Edge (Caddy) icin alt dizinler — config ve sertifika depolama.
mkdir -p "${DATA_DIR}/caddy" "${DATA_DIR}/caddy/data"

if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log "Docker ag olusturuluyor: ${DOCKER_NETWORK}"
  docker network create "${DOCKER_NETWORK}"
else
  log "Docker ag zaten mevcut: ${DOCKER_NETWORK}"
fi

# ---------------------------------------------------------------------------
# 4a. (Edge modu) Caddy icin baslangic Caddyfile
# ---------------------------------------------------------------------------
if [[ "${EDGE_ENABLED}" == "1" ]]; then
  CADDYFILE="${DATA_DIR}/caddy/Caddyfile"
  if [[ ! -f "${CADDYFILE}" ]]; then
    log "Baslangic Caddyfile yaziliyor: ${CADDYFILE}"
    cat > "${CADDYFILE}" <<EOF
{
  admin 0.0.0.0:2019
}

# Backoffice catchall — IP uzerinden self-signed HTTPS ile hemen erisilir.
:80 {
  reverse_proxy ${CONTAINER_NAME}:8000
}

:443 {
  tls internal
  reverse_proxy ${CONTAINER_NAME}:8000
}
EOF
  else
    log "Mevcut Caddyfile korunuyor: ${CADDYFILE}"
  fi
fi

# ---------------------------------------------------------------------------
# 4b. Backoffice imajini cek ve container'i baslat
# ---------------------------------------------------------------------------
log "Backoffice imaji cekiliyor: ${IMAGE}"
docker pull "${IMAGE}"

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  log "Mevcut '${CONTAINER_NAME}' container'i durduruluyor ve siliniyor..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

log "Backoffice container'i baslatiliyor..."
BACKOFFICE_PUBLISH=()
if [[ "${EDGE_ENABLED}" != "1" ]]; then
  BACKOFFICE_PUBLISH=( -p "${LEGACY_PORT}:8000" )
fi

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${DOCKER_NETWORK}" \
  "${BACKOFFICE_PUBLISH[@]}" \
  -e "BACKOFFICE_HOST_DATA_DIR=${DATA_DIR}" \
  -e "BACKOFFICE_CONTAINER_NAME=${CONTAINER_NAME}" \
  -e "EDGE_ENABLED=${EDGE_ENABLED}" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${DATA_DIR}:/data" \
  --label oserp.backoffice.role=control-plane \
  "${IMAGE}"

# ---------------------------------------------------------------------------
# 4c. (Edge modu) Caddy container'i
# ---------------------------------------------------------------------------
if [[ "${EDGE_ENABLED}" == "1" ]]; then
  log "Edge imaji cekiliyor: ${EDGE_IMAGE}"
  docker pull "${EDGE_IMAGE}"

  if docker ps -a --format '{{.Names}}' | grep -Fxq "${EDGE_CONTAINER}"; then
    log "Mevcut '${EDGE_CONTAINER}' container'i durduruluyor ve siliniyor..."
    docker stop "${EDGE_CONTAINER}" >/dev/null 2>&1 || true
    docker rm "${EDGE_CONTAINER}" >/dev/null 2>&1 || true
  fi

  log "Edge (Caddy) container'i baslatiliyor..."
  docker run -d \
    --name "${EDGE_CONTAINER}" \
    --restart unless-stopped \
    --network "${DOCKER_NETWORK}" \
    -p 80:80 \
    -p 443:443 \
    -v "${DATA_DIR}/caddy:/etc/caddy:ro" \
    -v "${DATA_DIR}/caddy/data:/data" \
    --label oserp.edge.role=reverse-proxy \
    "${EDGE_IMAGE}" \
    caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
fi

log "Container(lar) baslatildi:"
docker ps --filter "name=^/${CONTAINER_NAME}$" --filter "name=^/${EDGE_CONTAINER}$"

# ---------------------------------------------------------------------------
# 5. Bilgilendirme
# ---------------------------------------------------------------------------
PUBLIC_HINT="$(hostname -I 2>/dev/null | awk '{print $1}')"
log "Kurulum tamamlandi."
if [[ "${EDGE_ENABLED}" == "1" ]]; then
  log "Backoffice: https://${PUBLIC_HINT:-<sunucu-ip>}  (self-signed sertifika)"
  log "Domain baglamak icin panele girip 'Etki Alanlari' bolumunden ekleyin."
  warn "Self-signed sertifikada tarayici uyarisi gelir; gercek bir domain"
  warn "  baglayinca Let's Encrypt'e gecebilirsiniz."
else
  log "Backoffice: http://${PUBLIC_HINT:-<sunucu-ip>}:${LEGACY_PORT}"
fi
log "Ilk acilista admin sihirbazi sizi karsilayacak."
warn "GUVENLIK: Backoffice host Docker socket'ine erisir; portu yalnizca"
warn "  guvenilen aglara (VPN/Tailscale/IP allowlist) acin ya da reverse"
warn "  proxy arkasinda mTLS/Basic auth ile koruyun."
