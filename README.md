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
- [Ortam değişkenleri](#ortam-değişkenleri)
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
│  └─ api.Dockerfile    # API servisi imajı (ileride web/worker eklenecek)
├─ scripts/
│  └─ install.sh        # Ubuntu LTS Docker kurulum script'i
├─ docker-compose.yml   # db + migrate + api servisleri
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

Tüm sistemi (PostgreSQL + migration + API) bir Ubuntu LTS sunucuda tek script ile
ayağa kaldırabilirsiniz. `scripts/install.sh` sırasıyla:

1. Sistemi günceller (`apt update && upgrade`)
2. Güvenlik ayarlarını uygular — `ufw` güvenlik duvarı (yalnızca SSH + API portu),
   `unattended-upgrades` (otomatik güvenlik yamaları) ve `fail2ban`
3. Docker Engine + Compose eklentisini resmi depodan kurar
4. Repoyu klonlar, **rastgele sırlarla** (`JWT_SECRET`, DB parolası) bir `.env`
   üretir ve `docker compose up -d --build` ile servisleri başlatır

### Kullanım

Sunucuda root (veya sudo) yetkisiyle:

```bash
# Varsayılan repo (https://github.com/uzansadik/oserp.git) ile:
curl -fsSL https://raw.githubusercontent.com/uzansadik/oserp/main/scripts/install.sh | sudo bash

# veya repoyu klonlayıp:
sudo ./scripts/install.sh
```

Farklı bir repo/dal/port için ortam değişkenleriyle özelleştirilebilir:

```bash
sudo REPO_URL=https://github.com/org/repo.git BRANCH=main API_PORT=8080 ./scripts/install.sh
```

| Değişken        | Varsayılan                                | Açıklama                    |
| --------------- | ----------------------------------------- | --------------------------- |
| `REPO_URL`      | `https://github.com/uzansadik/oserp.git`  | Klonlanacak repo            |
| `BRANCH`        | `main`                                    | Klonlanacak dal             |
| `APP_DIR`       | `/opt/community`                          | Kurulum dizini              |
| `API_PORT`      | `3000`                                    | Host'ta yayınlanan API portu|
| `POSTGRES_USER` | `community`                               | Veritabanı kullanıcısı      |
| `POSTGRES_DB`   | `community`                               | Veritabanı adı              |
| `SSH_PORT`      | `22`                                      | `ufw`'da izin verilen SSH   |

### Compose servisleri

`docker-compose.yml` üç servis tanımlar:

- **db** — PostgreSQL 16. Yalnızca dahili Docker ağından erişilir (host'a port
  açılmaz), kalıcı `pgdata` volume kullanır, `pg_isready` ile sağlık kontrolü yapar.
- **migrate** — Veritabanı şemasını uygular ve sonlanır. `db` sağlıklı olduğunda
  bir kez çalışır.
- **api** — Fastify sunucusu. `db` sağlıklı **ve** `migrate` başarıyla bittikten
  sonra başlar, `API_PORT` üzerinden yayınlanır.

Manuel compose kullanımı (Docker zaten kuruluysa):

```bash
cp .env.docker.example .env   # değerleri düzenleyin
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

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
