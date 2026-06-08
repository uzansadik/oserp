#!/usr/bin/env bash
#
# Oserp Community - Ubuntu LTS Docker kurulum script'i
#
# Bu script bir Ubuntu LTS sunucusunda asagidakileri yapar:
#   1. Sistemi gunceller (apt update/upgrade)
#   2. Temel guvenlik ayarlarini uygular (ufw, fail2ban, otomatik guvenlik
#      guncellemeleri)
#   3. Docker Engine + Compose eklentisini resmi depodan kurar
#   4. Repoyu klonlar, rastgele sirlarla bir .env uretir ve Docker ile ayaga
#      kaldirir (migration dahil)
#
# Kullanim (root veya sudo ile):
#   sudo ./scripts/install.sh
#   # veya farkli bir repo icin:
#   sudo REPO_URL=https://github.com/<org>/<repo>.git ./scripts/install.sh
#
# Opsiyonel ortam degiskenleri:
#   REPO_URL      (vars: https://github.com/uzansadik/oserp.git) Klonlanacak repo
#   BRANCH        (vars: main)        Klonlanacak dal
#   APP_DIR       (vars: /opt/community) Uygulama dizini
#   API_PORT      (vars: 3000)        Host'ta yayinlanacak API portu
#   POSTGRES_USER (vars: community)   Veritabani kullanicisi
#   POSTGRES_DB   (vars: community)   Veritabani adi
#   SSH_PORT      (vars: 22)          ufw'da izin verilecek SSH portu
#   JWT_ISSUER    (vars: oserp-community)
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

gen_secret() {
  # 32 baytlik hex rastgele sir
  openssl rand -hex 32
}

# ---------------------------------------------------------------------------
# Yapilandirma (ortam degiskenlerinden okunur, varsayilanlarla)
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-${1:-https://github.com/uzansadik/oserp.git}}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/community}"
API_PORT="${API_PORT:-3000}"
POSTGRES_USER="${POSTGRES_USER:-community}"
POSTGRES_DB="${POSTGRES_DB:-community}"
SSH_PORT="${SSH_PORT:-22}"
JWT_ISSUER="${JWT_ISSUER:-oserp-community}"

# ---------------------------------------------------------------------------
# 0. On kontroller
# ---------------------------------------------------------------------------
require_root

if [[ -z "${REPO_URL}" ]]; then
  err "REPO_URL belirtilmedi."
  err "Ornek: sudo REPO_URL=https://github.com/org/repo.git ./scripts/install.sh"
  exit 1
fi

if ! grep -qi 'ubuntu' /etc/os-release 2>/dev/null; then
  warn "Bu script Ubuntu LTS icin tasarlandi. Farkli bir dagitim tespit edildi; devam ediliyor."
fi

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
# 1. Sistemi guncelle
# ---------------------------------------------------------------------------
log "Sistem paketleri guncelleniyor..."
apt-get update -y
apt-get upgrade -y

log "Temel araclar kuruluyor..."
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git openssl ufw fail2ban unattended-upgrades

# ---------------------------------------------------------------------------
# 2. Guvenlik ayarlari
# ---------------------------------------------------------------------------
log "Guvenlik duvari (ufw) yapilandiriliyor..."
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow "${API_PORT}/tcp" comment 'Community API'
ufw --force enable
ufw status verbose || true

log "Otomatik guvenlik guncellemeleri etkinlestiriliyor..."
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now unattended-upgrades || true

log "fail2ban (SSH koruma) etkinlestiriliyor..."
systemctl enable --now fail2ban || true

# ---------------------------------------------------------------------------
# 3. Docker kurulumu (resmi Docker apt deposu)
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
# 4. Repoyu klonla / guncelle
# ---------------------------------------------------------------------------
if [[ -d "${APP_DIR}/.git" ]]; then
  log "Mevcut repo guncelleniyor: ${APP_DIR}"
  git -C "${APP_DIR}" fetch --all --prune
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  log "Repo klonlaniyor: ${REPO_URL} -> ${APP_DIR}"
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

# ---------------------------------------------------------------------------
# 5. .env uretimi (Docker ile ayaga kaldirmadan ONCE)
# ---------------------------------------------------------------------------
ENV_FILE="${APP_DIR}/.env"
if [[ -f "${ENV_FILE}" ]]; then
  warn ".env zaten mevcut; mevcut sirlar korunuyor. Yeniden uretmek icin once silin."
else
  log ".env uretiliyor (rastgele sirlarla)..."
  POSTGRES_PASSWORD="$(gen_secret)"
  JWT_SECRET="$(gen_secret)"

  umask 077
  cat > "${ENV_FILE}" <<EOF
# Otomatik uretildi: $(date -u +%Y-%m-%dT%H:%M:%SZ)
API_PORT=${API_PORT}
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

JWT_SECRET=${JWT_SECRET}
JWT_ISSUER=${JWT_ISSUER}

IAM_MIGRATIONS_DIR=/app/packages/iam/drizzle
EOF
  chmod 600 "${ENV_FILE}"
  log ".env olusturuldu: ${ENV_FILE} (izinler 600)"
fi

# ---------------------------------------------------------------------------
# 6. Docker ile ayaga kaldir (build + migration + api)
# ---------------------------------------------------------------------------
log "Docker imajlari build ediliyor ve servisler baslatiliyor..."
docker compose --project-directory "${APP_DIR}" up -d --build

log "Servis durumu:"
docker compose --project-directory "${APP_DIR}" ps

log "Kurulum tamamlandi."
log "API saglik kontrolu: curl http://localhost:${API_PORT}/health"
