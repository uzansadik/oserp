# Oserp Community

Modüler, alan-odaklı (DDD) bir kurumsal kaynak planlama (ERP) platformu. Proje;
**Domain-Driven Design**, **CQRS** ve **event-driven** mimari desenleriyle, pnpm
workspace tabanlı bir monorepo olarak geliştirilir.

İlk sınırlı bağlam (bounded context) olan **IAM** (kimlik & erişim yönetimi)
tamamlanmıştır; Fastify tabanlı bir HTTP API ile sunulur ve Docker ile Ubuntu LTS
sunucuda tek komutla ayağa kaldırılabilir.

---

## İçindekiler

- [Mimari](#mimari)
- [Monorepo yapısı](#monorepo-yapısı)
- [Teknolojiler](#teknolojiler)
- [Hızlı başlangıç (yerel geliştirme)](#hızlı-başlangıç-yerel-geliştirme)
- [Docker ile kurulum (Ubuntu LTS)](#docker-ile-kurulum-ubuntu-lts)
  - [İlk kurulum: sistem kullanıcısı (bootstrap)](#ilk-kurulum-sistem-kullanıcısı-bootstrap)
  - [Geliştirici modu (legacy compose)](#geliştirici-modu-legacy-compose)
- [Ortam değişkenleri](#ortam-değişkenleri)
  - [IAM bootstrap ortam değişkenleri](#iam-bootstrap-ortam-değişkenleri)
- [API uçları](#api-uçları)
- [Geliştirme komutları](#geliştirme-komutları)

---

## Mimari

Her sınırlı bağlam (örn. `iam`) kendi içinde katmanlı bir DDD yapısına sahiptir:

- **domain** — entity'ler, aggregate'ler, value-object'ler, domain event'leri ve
  domain servisleri. Saf iş kuralları; altyapıya bağımlı değildir.
- **application** — use-case'ler (command/query handler'ları), portlar (arayüzler),
  yetkilendirme politikaları. CQRS ile komut ve sorgular ayrıştırılmıştır.
- **infrastructure** — Drizzle ORM ile PostgreSQL kalıcılığı, JWT token servisi,
  parola/karma adaptörleri, in-memory event bus ve **Transactional Outbox**.
- **interface (api)** — Fastify route'ları, controller'lar, middleware'ler
  (authenticate/authorize) ve HTTP hata eşleme.

Olaylar, kalıcılıkla aynı işlemde (transaction) `iam_outbox` tablosuna yazılır;
bir publisher bunları okuyup event bus'a yayar. Bu yapı, ileride Kafka gibi bir
mesaj kuyruğuna geçişi tek bir adaptör değişimiyle mümkün kılar.

---

## Monorepo yapısı

```
.
├─ apps/
│  └─ api/              # Fastify HTTP uygulaması (composition root + server)
├─ packages/
│  ├─ iam/              # IAM sınırlı bağlamı (domain + application + infra + api)
│  ├─ catalog/          # Ürün kataloğu bağlamı (gelişim aşamasında)
│  ├─ sales/            # Satış bağlamı (gelişim aşamasında)
│  ├─ interfaces/       # Paylaşılan arayüzler
│  └─ shared/           # Paylaşılan db/ui yardımcıları
├─ docker/
│  ├─ api.Dockerfile         # API servisi imajı (GHCR'a yayınlanır)
│  └─ backoffice.Dockerfile  # Backoffice (Next.js) imajı (GHCR'a yayınlanır)
├─ scripts/
│  ├─ install.sh             # Ubuntu LTS backoffice kurulum script'i (yeni akış)
│  └─ install-legacy.sh      # Eski compose tabanlı kurulum (geliştirici modu)
├─ docker-compose.yml        # db + migrate + api (geliştirici/legacy)
└─ pnpm-workspace.yaml
```

---

## Teknolojiler

| Alan            | Araç                                   |
| --------------- | -------------------------------------- |
| Dil             | TypeScript (ESNext, Bundler resolution)|
| Çalışma zamanı  | Node.js 24                             |
| Paket yöneticisi| pnpm 11 (workspace + catalog)          |
| Görev koşucusu  | Turborepo                              |
| HTTP            | Fastify 5                              |
| Veritabanı      | PostgreSQL 16 + Drizzle ORM            |
| Doğrulama       | Zod                                    |
| Kimlik          | JWT (HS256) + opaque refresh token     |
| Test            | Vitest                                 |
| Lint/format     | Biome                                  |
| Derleme         | tsup (ESM)                             |

---

## Hızlı başlangıç (yerel geliştirme)

### Ön koşullar

- Node.js 24+
- pnpm 11+ (`corepack enable` ile etkinleştirilebilir)
- Çalışan bir PostgreSQL örneği (yerel ya da Docker)

### Adımlar

```bash
# 1. Bağımlılıkları kur
pnpm install

# 2. apps/api ortam dosyasını hazırla
cp apps/api/.env.example apps/api/.env
# apps/api/.env içindeki DATABASE_URL ve JWT_SECRET değerlerini düzenleyin

# 3. Veritabanı şemasını uygula (migration)
cd packages/iam
pnpm db:migrate
cd ../..

# 4. API'yi geliştirme modunda başlat
pnpm --filter @oserp-community/api dev
```

API varsayılan olarak `http://localhost:3000` adresinde çalışır.

Sağlık kontrolü:

```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":...}
```

---

## Docker ile kurulum (Ubuntu LTS)

**Yeni akış (tavsiye edilen):** Sunucuya yalnızca **backoffice** container'ı
kurulur; PostgreSQL, IAM API ve diğer servisler tarayıcıdan tek tıkla
ayağa kaldırılır. Repo klonlamanız, `.env` üretmeniz veya `docker compose`
komutu çalıştırmanız gerekmez.

`scripts/install.sh` sırasıyla:

1. Sistemi günceller (`apt update && upgrade`) — opsiyonel, `SKIP_SYSTEM=1` ile
   atlanabilir
2. `ufw` (SSH + 8000), `unattended-upgrades` ve `fail2ban` ayarlar
3. Docker Engine + Compose eklentisini resmi depodan kurar
4. `ghcr.io/uzansadik/oserp-backoffice:latest` imajını çeker, `oserp-net`
   ağını oluşturur ve backoffice container'ını host Docker socket'i + kalıcı
   `/var/lib/oserp-backoffice` volume'u + port 8000 ile başlatır

### Kullanım

Sunucuda root (veya sudo) yetkisiyle:

**Etkileşimli (önerilen — script sizi yönlendirir):**

```bash
curl -fsSL https://raw.githubusercontent.com/uzansadik/oserp/main/scripts/install.sh -o install.sh
sudo bash install.sh
```

Script sırayla soracak:
- Mod seçimi (1=Domain/ACME, 2=IP-only) — varsayılan: 2
- Domain adı (domain modunda zorunlu) — örn. `panel.firma.com`
- ACME e-posta (Let's Encrypt bildirimleri için)
- SSH portu, edge kurulumu, sistem güncellemesi tercihleri (hepsinde Enter'a basıp varsayılanı alabilirsiniz)

**Sessiz / non-interaktif (otomasyon, CI, kopyala-yapıştır):**

```bash
# IP-only (self-signed) — domain gerektirmez
curl -fsSL https://raw.githubusercontent.com/uzansadik/oserp/main/scripts/install.sh | sudo bash

# Domain modu (ACME / Let's Encrypt) — önerilen
curl -fsSL https://raw.githubusercontent.com/uzansadik/oserp/main/scripts/install.sh | \
  sudo bash -s -- PRIMARY_DOMAIN=panel.firma.com ACME_EMAIL=admin@firma.com
```

Veya repoyu klonlayıp:

```bash
git clone https://github.com/uzansadik/oserp.git
cd oserp

# Etkileşimli
sudo ./scripts/install.sh

# Sessiz — IP-only
sudo ./scripts/install.sh

# Sessiz — Domain modu
sudo PRIMARY_DOMAIN=panel.firma.com ACME_EMAIL=admin@firma.com ./scripts/install.sh
```

> **Not:** `curl | sudo bash` pattern'inde script interaktif soru soramaz (stdin
> piped bash'e gidiyor); bu yüzden ya `bash -s -- ENV=değer` ile non-interaktif
> çağırın ya da önce indirip `sudo bash install.sh` ile çalıştırın.

| Değişken         | Varsayılan                                       | Açıklama                                  |
| ---------------- | ------------------------------------------------ | ----------------------------------------- |
| `IMAGE`          | `ghcr.io/uzansadik/oserp-backoffice:latest`      | Çekilecek backoffice imajı                |
| `CONTAINER_NAME` | `oserp-backoffice`                               | Container adı                             |
| `DATA_DIR`       | `/var/lib/oserp-backoffice`                      | SQLite + state için kalıcı host dizini    |
| `EDGE_ENABLED`   | `1`                                              | `0` ise Caddy kurulmaz, backoffice doğrudan host portuna açılır |
| `LEGACY_PORT`    | `8000`                                           | `EDGE_ENABLED=0` iken host portu         |
| `PRIMARY_DOMAIN` | _(boş)_                                          | Set edilirse domain moduna geçer (ACME/Let's Encrypt). Örn. `backoffice.example.com` |
| `ACME_EMAIL`     | `admin@${PRIMARY_DOMAIN}`                        | Let's Encrypt bildirim e-postası          |
| `SSH_PORT`       | `22`                                             | `ufw`'da izin verilen SSH portu           |
| `DOCKER_NETWORK` | `oserp-net`                                      | Yönetilen servislerin paylaşacağı ağ      |
| `SKIP_SYSTEM`    | `0`                                              | `1` ise apt/güvenlik adımları atlanır     |

**Modlar:**

- `PRIMARY_DOMAIN` boş → **IP-only** modu. HTTP 80 ve HTTPS 443 (self-signed, `tls internal`).
  `https://<sunucu-ip>` adresinde tarayıcı sertifika uyarısı verir; **"Advanced → Proceed"** ile geçilebilir.
- `PRIMARY_DOMAIN` set → **Domain** modu. Caddy ACME HTTP-01 ile otomatik sertifika alır
  (80 portu açık olmalı). `https://${PRIMARY_DOMAIN}` üzerinden uyarısız erişim.

### Hangi modu seçmeliyim?

**Domain'iniz varsa (örn. `example.com`, `firma.com.tr`, kendi subdomain'iniz):**

1. Domain sağlayıcınızın DNS yönetimine girin.
2. Backoffice için kullanmak istediğiniz **ana hostname**'i seçin (örn. `panel.firma.com.tr`).
3. O hostname için **A kaydı** ekleyin → sunucu IP'niz (örn. `203.0.113.42`).
4. 5-10 dakika DNS yayılmasını bekleyin. Doğrulamak için:
   ```bash
   dig +short panel.firma.com.tr   # sunucu IP'nizi dönmeli
   ```
5. Kurulumu domain modunda çalıştırın:
   ```bash
   sudo PRIMARY_DOMAIN=panel.firma.com.tr ACME_EMAIL=admin@firma.com.tr bash install.sh
   ```
6. `https://panel.firma.com.tr` adresine gidin — sertifika uyarısız açılmalı.

> **ACME / Let's Encrypt notu:** `ACME_EMAIL` verilmezse `admin@${PRIMARY_DOMAIN}` kullanılır
> ve Let's Encrypt sertifika süresi dolmadan önce uyarı gönderir. Gerçek bir adres verin.

**Domain'iniz yoksa (sadece IP, test/hızlı deneme):**

```bash
sudo bash install.sh   # PRIMARY_DOMAIN bos birakildi -> IP-only modu
```

`http://<sunucu-ip>` ile giriş yapılır. HTTPS için tarayıcı self-signed uyarısı verir,
"Advanced → Proceed anyway" ile geçilir. **Üretim için domain modu şiddetle tavsiye edilir.**

**Ön koşullar (her iki mod):**

- Ubuntu 22.04 veya 24.04 LTS (root veya sudo yetkisi)
- 22 (SSH) ve 80, 443 (HTTP/HTTPS) portları dış dünyaya açık
- Sunucu IP'si statik (kiralık VPS veya reserved IP)
- Domain modu için: yukarıdaki DNS adımları tamamlanmış

Kurulum sonrası ilgili adrese gidip ilk açılış admin sihirbazını tamamlayın,
ardından **Servis Kur** ekranından `iam` (PostgreSQL + API + migration) servisini
tek tıkla ayağa kaldırın.

> **Güvenlik:** Backoffice host Docker socket'ine erişir; portu yalnızca
> güvenilen ağlara (VPN/Tailscale/IP allowlist) açın ya da reverse proxy
> arkasında mTLS/Basic auth ile koruyun. Public IP'ye açmayın.

### İlk kurulum: sistem kullanıcısı (bootstrap)

Backoffice, **Servis Kur** ekranından IAM servisini kurarken bir form ile ilk
yönetici (sistem kullanıcısı) bilgilerini ister. Kurulum tamamlandığında IAM API'ye
`POST /iam/users/bootstrap-register` çağrısı yapılır ve bu kullanıcı **tüm
yetkilerle** (`*.*.*` wildcard permission) seed edilir. Sonraki adımlarda
backoffice UI üzerinden normal kullanıcılar oluşturulabilir.

Akış:

1. `iam` servisi seçildiğinde ek form açılır: **ad, soyad, e-posta, kullanıcı
   adı, parola** (aynı kurallar: e-posta format, kullanıcı adı 3-20, parola ≥ 8).
2. `Kur` butonuna basıldığında:
   - PostgreSQL + IAM container'ları başlatılır (mevcut akış).
   - Migration çalışır.
   - Bootstrap adımı çalışır: kullanıcı + `*.*.*` permission + `super-admin`
     rolü + membership.
3. Sistem kullanıcısı, `POST /iam/auth/login` ile giriş yaparak tüm IAM (ve
   ileride eklenecek tüm context'lerin) API'lerine erişebilir.

**Tek seferlik koruma:** `/iam/users/bootstrap-register` sadece veritabanı
boşken kabul eder. `iam_users` tablosunda bir kayıt varsa `409
BOOTSTRAP_NOT_ALLOWED` döner. Endpoint kimlik doğrulaması gerektirmez ama
internal Docker ağının dışında erişilememelidir (compose'da `expose` yok).

**Örnek curl (legacy compose / debug):**

```bash
curl -X POST http://localhost:3000/iam/users/bootstrap-register \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Sadık",
    "surname": "Uzan",
    "email": "admin@oserp.local",
    "username": "admin",
    "password": "ChangeMe123!"
  }'
# → 201 { "userId": "...", "membershipId": "...", "permissionCode": "*.*.*" }
```

### Geliştirici modu (legacy compose)

Backoffice olmadan yalnızca PostgreSQL + API stack'ini doğrudan compose ile
ayağa kaldırmak için `scripts/install-legacy.sh` ve kök `docker-compose.yml`
kullanılır. Bu akış repoyu klonlar, `.env` üretir ve `db + migrate + api`
servislerini build edip başlatır:

```bash
sudo ./scripts/install-legacy.sh
# veya yerel/dev:
cp .env.docker.example .env   # değerleri düzenleyin
docker compose up -d --build
docker compose logs -f api
```

Legacy script aynı `REPO_URL`, `BRANCH`, `APP_DIR`, `API_PORT`,
`POSTGRES_USER`, `POSTGRES_DB`, `SSH_PORT` ortam değişkenlerini kabul eder.

---

## Ortam değişkenleri

| Değişken        | Örnek                                            | Açıklama                          |
| --------------- | ------------------------------------------------ | --------------------------------- |
| `NODE_ENV`      | `production`                                     | Çalışma ortamı                    |
| `HOST`          | `0.0.0.0`                                         | Dinlenecek arabirim               |
| `PORT`          | `3000`                                            | Uygulama portu (container içi)    |
| `DATABASE_URL`  | `postgresql://user:pass@db:5432/community`        | PostgreSQL bağlantısı             |
| `JWT_SECRET`    | (uzun rastgele dize)                              | JWT imzalama anahtarı (zorunlu)   |
| `JWT_ISSUER`    | `oserp-community`                                 | JWT issuer (opsiyonel)            |

### IAM bootstrap ortam değişkenleri

| Değişken                  | Varsayılan                                 | Açıklama                                                                                  |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `IAM_BOOTSTRAP_COMPANY_ID` | `00000000-0000-4000-8000-000000000001`    | Sistem kullanıcısının membership alacağı placeholder company UUID'si. UUID v4 olmalı.    |

Docker (compose) için ek değişkenler `.env.docker.example` dosyasında: `API_PORT`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `IAM_MIGRATIONS_DIR`.

> **Güvenlik:** `.env` dosyaları sırlar içerir ve `.gitignore` ile dışlanır;
> depoya gönderilmez. Yalnızca `*.env.example` şablonları izlenir.

---

## API uçları

Tüm IAM uçları `/iam` ön ekiyle sunulur. Kimlik doğrulama gerektiren uçlar
`Authorization: Bearer <accessToken>` başlığı bekler.

| Metot  | Yol                                | Açıklama                  | Yetki      |
| ------ | ---------------------------------- | ------------------------- | ---------- |
| GET    | `/health`                          | Sağlık kontrolü           | Açık       |
| POST   | `/iam/auth/login`                  | Giriş (token üretir)      | Açık       |
| POST   | `/iam/auth/refresh`                | Token yenileme            | Açık       |
| POST   | `/iam/auth/logout`                 | Oturum kapatma            | Açık       |
| POST   | `/iam/users/bootstrap-register`    | İlk sistem kullanıcısı seed | Açık (yalnızca boş DB) |
| POST   | `/iam/users`                       | Kullanıcı oluştur         | Korumalı   |
| GET    | `/iam/users`                       | Kullanıcıları listele     | Korumalı   |
| GET    | `/iam/users/:userId`               | Kullanıcı getir           | Korumalı   |
| POST   | `/iam/roles`                       | Rol oluştur               | Korumalı   |
| POST   | `/iam/permissions`                 | İzin oluştur              | Korumalı   |
| POST   | `/iam/memberships`                 | Üyelik ver                | Korumalı   |
| POST   | `/iam/api-credentials`             | API anahtarı üret         | Korumalı   |

Örnek giriş isteği:

```bash
curl -X POST http://localhost:3000/iam/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Password123"}'
```

> İlk yetkili kullanıcının veritabanına seed edilmesi gerekir; korumalı uçlar
> aktif bir oturum ve uygun izin olmadan kullanılamaz.

---

## Geliştirme komutları

Kök dizinden (Turborepo tüm paketlerde çalıştırır):

```bash
pnpm build      # tüm paketleri derle
pnpm test       # tüm testleri çalıştır
pnpm check      # Biome ile lint + format (yazarak düzeltir)
pnpm dev        # geliştirme sunucularını başlat
```

Tek bir paket için:

```bash
pnpm --filter @oserp-community/iam test       # IAM testleri (Vitest)
pnpm --filter @oserp-community/api build      # yalnızca API'yi derle
```

Veritabanı (IAM):

```bash
cd packages/iam
pnpm db:generate   # şema değişikliklerinden migration üret
pnpm db:migrate    # bekleyen migration'ları uygula
pnpm db:push       # şemayı doğrudan it (yalnızca geliştirme)
```
