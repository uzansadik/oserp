#!/usr/bin/env bash
#
# Oserp Community - Ubuntu LTS Backoffice kurulum script'i
#
# Bu script bir Ubuntu LTS sunucusunda asagidakileri yapar:
#   1. Sistemi gunceller (apt update/upgrade)
#   2. Temel guvenlik ayarlarini uygular (ufw, fail2ban, otomatik guvenlik
#      guncellemeleri)
#   3. Docker Engine + Compose eklentisini resmi depodan kurar
#   4. GHCR'den oserp-backoffice imajini ceker ve tek container olarak
#      ayaga kaldirir (Docker socket + persistent volume + port 8000)
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
#   IMAGE          (vars: ghcr.io/uzansadik/oserp-backoffice:latest)
#   CONTAINER_NAME (vars: oserp-backoffice)
#   DATA_DIR       (vars: /var/lib/oserp-backoffice) Backoffice SQLite + state
#   PORT           (vars: 8000)  Host'ta yayinlanacak backoffice portu
#   SSH_PORT       (vars: 22)    ufw'da izin verilecek SSH portu
#   DOCKER_NETWORK (vars: oserp-net) Yonetilen servislerin paylasacagi ag
#   SKIP_SYSTEM    (vars: 0)     1 ise apt update/upgrade + guvenlik atlanir
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
PORT="${PORT:-8000}"
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
  ufw allow "${PORT}/tcp" comment 'Oserp Backoffice'
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

if ! docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  log "Docker ag olusturuluyor: ${DOCKER_NETWORK}"
  docker network create "${DOCKER_NETWORK}"
else
  log "Docker ag zaten mevcut: ${DOCKER_NETWORK}"
fi

# ---------------------------------------------------------------------------
# 4. Imaji cek ve backoffice container'i baslat
# ---------------------------------------------------------------------------
log "Backoffice imaji cekiliyor: ${IMAGE}"
docker pull "${IMAGE}"

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  log "Mevcut '${CONTAINER_NAME}' container'i durduruluyor ve siliniyor..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

log "Backoffice container'i baslatiliyor..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${DOCKER_NETWORK}" \
  -p "${PORT}:8000" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${DATA_DIR}:/data" \
  --label oserp.backoffice.role=control-plane \
  "${IMAGE}"

log "Container baslatildi:"
docker ps --filter "name=^/${CONTAINER_NAME}$"

# ---------------------------------------------------------------------------
# 5. Bilgilendirme
# ---------------------------------------------------------------------------
PUBLIC_HINT="$(hostname -I 2>/dev/null | awk '{print $1}')"
log "Kurulum tamamlandi."
log "Backoffice: http://${PUBLIC_HINT:-<sunucu-ip>}:${PORT}"
log "Ilk acilista admin sihirbazi sizi karsilayacak."
warn "GUVENLIK: Backoffice host Docker socket'ine erisir; portu yalnizca"
warn "  guvenilen aglara (VPN/Tailscale/IP allowlist) acin ya da reverse"
warn "  proxy arkasinda mTLS/Basic auth ile koruyun."
