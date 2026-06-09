# Backoffice Geliştirme Planı

> Bu plan, `@oserp-community/backoffice` ve `@oserp-community/ui` paketlerinin
> sıfırdan production-ready hale getirilmesini fazlara böler. Her faz **kendi
> içinde test edilebilir** bir bütündür; sıradaki faz öncekinin üzerine
> eklenebilir. Her faz tamamlandığında `pnpm build` + `pnpm typecheck` yeşil
> olmalı.

---

## Mimari kararlar (kilitlendi)

| Karar                 | Seçim                                                         |
| --------------------- | ------------------------------------------------------------- |
| Framework             | Next.js 16 (App Router, TypeScript, React 19)                 |
| UI kütüphanesi        | shadcn/ui → `@oserp-community/ui` (Tailwind v4)               |
| Container kontrolü    | Docker socket mount + `dockerode`                             |
| Servis imajları       | GHCR (`ghcr.io/uzansadik/oserp-*:latest`) + GitHub Actions    |
| Durum saklama         | SQLite (`better-sqlite3`) `/data/backoffice.db`               |
| Kimlik doğrulama      | İlk açılışta admin sihirbazı, sonrasında oturum cookie'si     |
| Port                  | 8000 (host + container)                                       |

---

## Faz 0 — Scaffold (shadcn monorepo entegrasyonu) ✅

> Bitti. Geçici dizinde `shadcn init --name backoffice --template next --monorepo --preset bJMSkfGi`
> ile üretilen yapı `apps/backoffice` ve `packages/ui` olarak workspace'e
> entegre edildi. Mevcut Turborepo + pnpm workspace ayarları aynen kullanıldı;
> ek olarak `pnpm-workspace.yaml#allowBuilds` içine `sharp: true` ve
> `unrs-resolver: true` eklendi, `.gitignore` içine `.next/` eklendi.

- [x] **0.1** Geçici bir dizinde scaffold üret:
      ```powershell
      $tmp = "C:\Temp\shadcn-mono"
      Set-Location $tmp
      pnpm dlx shadcn@latest init --name backoffice --template next --monorepo --preset bJMSkfGi --yes
      ```
- [x] **0.2** Üretilen `apps/web` → `community/apps/backoffice` olarak kopyalandı.
      `package.json` adı `@oserp-community/backoffice`, port 8000.
- [x] **0.3** Üretilen `packages/ui` → `community/packages/ui` olarak kopyalandı.
      `package.json` adı `@oserp-community/ui`.
- [x] **0.4** `components.json` ve tüm import yolları
      `@workspace/ui` → `@oserp-community/ui` olarak yeniden yazıldı.
- [x] **0.5** `apps/backoffice/package.json` `@oserp-community/ui: workspace:*`
      bağımlılığı ile bağlandı; `@workspace/eslint-config` ve
      `@workspace/typescript-config` (shadcn scaffold'una özgü) atıldı —
      bizim kök Biome + base tsconfig'imiz kullanılıyor.
- [x] **0.6** `pnpm install` — 376 paket eklendi, lockfile güncel.
- [x] **0.7** Mevcut `turbo.json` `build`/`dev` görevleri yeterli; ek görev
      gerekmedi (`.next/**` zaten `outputs`'ta vardı).
- [x] **0.8** Scriptler: `dev: next dev -p 8000`, `start: next start -p 8000`,
      `build: next build`, `typecheck: tsc --noEmit`.
- [x] **0.9** Sağlama: `pnpm --filter @oserp-community/backoffice build` yeşil,
      dev server `http://localhost:8000/demo` üzerinde 200 OK döndü.
- [x] **0.10** `/demo` sayfası eklendi: 15 shadcn componenti
      (button, badge, card, alert, avatar, input, label, select, switch,
      separator, tabs, table, textarea, tooltip, dialog) galeri olarak sergileniyor.
      Ana sayfada `/demo`'ya link bulunur.

**Çıktı:** Next.js + shadcn iskeleti port 8000'de çalışıyor, UI paketi hazır,
`pnpm dlx shadcn@latest add <component>` ile bileşen eklenebilir.

---

## Faz 1 — Veri katmanı (SQLite + servisler tablosu) ✅

- [x] **1.1** `@libsql/client` + `drizzle-orm` + `drizzle-kit` eklendi.
      (Not: `better-sqlite3` yerine `@libsql/client` tercih edildi — Windows +
      Node 24'te native compile zorluğu yok, prebuild binary'lerle çalışıyor.)
- [x] **1.2** `server/db.ts` — `@libsql/client` üzerinden Drizzle bağlantısı.
      Async lazy singleton (`Promise<Holder>` globalThis cache). Yol env
      (`BACKOFFICE_DB_PATH`) ile değiştirilebilir; default: prod
      `/data/backoffice.db`, dev `.data/backoffice.db`.
- [x] **1.3** Şema (`server/schema.ts`):
      - `admin_users(id, email, password_hash, created_at)`
      - `services(name PK, image, current_tag, status, last_started_at)`
      - `service_events(id, service_name, kind, payload_json, at)`
      - + index: `idx_service_events_service_name`
- [x] **1.4** `server/migrate.ts` — el-yazısı `MIGRATIONS` dizisi +
      `backoffice_migrations(id PK, applied_at)` tracker tablosu. Her id için
      idempotent uygulama (`executeMultiple`), uygulanan migration'lar
      atlanır. İlk migration `0001_init`.
- [x] **1.5** Repository sınıfları:
      - `AdminUsersRepository` (`count`, `findByEmail`, `findById`, `create`)
      - `ServicesRepository` (`list`, `findByName`, `upsert`, `updateStatus`,
        `remove`, `recordEvent`, `listEvents`)
      - `server/index.ts` barrel: `getContext()` -> `{ adminUsers, services }`
- [x] **Validation**: `pnpm typecheck` ✅, `pnpm build` ✅,
      `GET /api/health` 200 OK -> `{adminCount:0, serviceCount:0}` (migrations
      runtime'da otomatik koştu).

**Çıktı:** Persistent durum yazma/okuma çalışıyor — `/api/health` doğruluyor.

---

## Faz 2 — Auth (ilk açılış sihirbazı + oturum) ✅

- [x] **2.1** `server/auth/passwords.ts` — `argon2id` hash/verify
      (memoryCost=19456, timeCost=2, parallelism=1).
- [x] **2.2** `server/auth/session.ts` + `sessions-repository.ts` — opaque
      token (32 byte base64url) + DB `sessions` tablosu (`token PK, user_id,
      expires_at, created_at` + indexler). Cookie: `bo_session`, HttpOnly,
      SameSite=Strict, Secure (prod), Path=/, Max-Age 7 gün.
- [x] **2.3** `app/setup/page.tsx` + `POST /api/setup` — admin yoksa
      e-posta + parola (min 12 karakter) al, hash'le, kaydet, session
      oluştur, `/`'a yönlendir. Admin varsa otomatik `/login` veya `/`'a
      redirect.
- [x] **2.4** `app/login/page.tsx` + `POST /api/login` — credentials ->
      session. Admin yoksa `/setup`'a, oturum varsa `/`'a redirect.
- [x] **2.5** `proxy.ts` (Next.js 16'da `middleware.ts`'in yeni adı) —
      `/setup`, `/login`, `/api/setup`, `/api/login`, `/api/health` dışındaki
      route'larda `bo_session` cookie'si zorunlu; yoksa `/login`'a redirect.
      Static asset'ler matcher'dan dışlandı.
- [x] **2.6** `POST /api/logout` + `LogoutButton` componenti — DB session'ı
      siler, cookie'yi Max-Age=0 ile boşaltır, `/login`'a yönlendirir.
- [x] **Validation**: typecheck ✅, build ✅ (warning yok), uçtan-uca curl
      akışı: unauth `/` -> 307 `/login` -> 307 `/setup` -> 200 sihirbaz |
      `POST /api/setup` -> 200 + Set-Cookie | auth `/` -> 200
      "Giriş yapıldı: admin@oserp.local" | `/api/health` adminCount=1 |
      `POST /api/logout` -> cookie temizleniyor | post-logout `/` -> 307
      `/login` | ikinci setup -> 409.

**Çıktı:** Backoffice'e giriş gerektiriyor; admin yoksa sihirbaz açılıyor.

---

## Faz 3 — Docker kontrolü ✅

- [x] **3.1** `dockerode` (+ `@types/dockerode`) eklendi.
      `server/docker/client.ts` — `DOCKER_HOST` env'ini öncelikle okur
      (`unix://`, `npipe://`, `tcp://` şemalarını destekler), yoksa Linux'ta
      `/var/run/docker.sock`, Windows dev'de `//./pipe/docker_engine`'e
      bağlanır. `globalThis` cache ile tekil instance.
- [x] **3.2** `DockerService` sınıfı (`server/docker/docker-service.ts`):
      - `pingDaemon(): Promise<DaemonInfo>` — version + info döner, daemon
        yoksa graceful `{reachable:false, error}` (throw etmez).
      - `pullImage(image, tag, onProgress?)` — `modem.followProgress` ile
        ilerleme yüzdesi raporlar.
      - `runContainer(spec)` — önce varsa eski container'ı silip yenisini
        `unless-stopped` restart policy ile başlatır; label'lar:
        `oserp.backoffice.managed=true`, `oserp.backoffice.service=<name>`.
      - `stopContainer(name, {ignoreMissing?})`, `removeContainer(name, ...)`,
        `getContainerStatus(name)` (port binding + state),
        `ensureNetwork(name)`, `streamLogs(name, {tail, follow})`.
      - 404 (no such container) ve 304 (already stopped) hataları içeri
        sindiriliyor.
- [x] **3.3** `GET /api/docker/status` — admin cookie zorunlu;
      `pingDaemon()` sonucunu döner (200 reachable, 503 yoksa).
- [x] **3.4** `GET /api/services` — `services` tablosu + her satır için
      `getContainerStatus` (paralel `Promise.all`, hata varsa
      `containerError` alanı).
- [x] **3.5** `POST /api/services/:name/install` — body'den `image, tag,
      env, ports, volumes, network` alır; `services` upsert + `installing`
      durumu, `pullImage` + (varsa) `ensureNetwork` + `runContainer`,
      başarıda `running` + `lastStartedAt`, hatada `failed`; tüm geçişler
      `service_events` tablosuna düşer.
      Ek: `POST /api/services/:name/stop` (graceful stop + event).
- [x] **3.6** `GET /api/services/:name/logs?tail=&follow=` — SSE
      (`text/event-stream`). Docker'ın 8 byte multiplex frame header'ını
      `stripDockerHeader` ile parse edip her satırı `data: ...\n\n` olarak
      yazar. `request.signal.abort` ile stream destroy edilir.
- [x] **Auth**: tüm `/api/docker/*` ve `/api/services/*` route'ları
      handler içinde `getCurrentAdmin()` kontrolü yapar; proxy zaten cookie
      varlığını zorlar.
- [x] **next.config.ts**: `serverExternalPackages` listesine `dockerode` ve
      `argon2` eklendi (native bağımlılıkların Turbopack tarafından
      bundle'lanmasını engeller).
- [x] **Validation**: typecheck ✅, build ✅ (15 worker, 4 sayfa). Curl
      smoke (Docker daemon yok): proxy 307 (unauth) | setup 200 | docker
      status 503 + `{reachable:false, error:"connect ENOENT ..."}` |
      services [] 200 | unknown 404 | install missing image 400 | install
      bad name 400. Tüm validation kuralları çalışıyor.

**Çıktı:** Backoffice host Docker daemon'ını okuyabilir ve yönetebilir
(daemon yoksa graceful degradation).

---

## Faz 4 — Servis kataloğu ve kurulum akışı ✅

- [x] **4.1** Statik servis kataloğu (`server/catalog.ts`): `postgres` (16-bookworm,
      named volume `oserp-pgdata`) + `iam` (`ghcr.io/uzansadik/oserp-api`,
      `dependsOn: ['postgres']`). `EnvSpecField` her alan için `default`,
      `generate: 'password'|'secret-hex'|'secret-base64'` veya `optional`
      destekler. `iam.internalEnvFromDeps.DATABASE_URL` postgres user/password/db
      değerlerini okuyup `postgresql://...@postgres:5432/...` dizesini üretir
      (servisler `oserp-net` ağında olduğundan host adı = servis adı).
      `resolveInstallOrder(target)` döngüsel bağımlılığı yakalar.
- [x] **4.2** `InstallOrchestrator` (`server/install-orchestrator.ts`):
      1. `resolveInstallOrder` → deps önce.
      2. `ensureNetwork('oserp-net')`.
      3. Her servis için: `getEnv` (mevcut DB env'i koru) + `resolveEnvForEntry`
         (user input > existing > generated > default; eksik zorunlu hata),
         + `internalEnvFromDeps` (deps env'inden türetilir).
      4. `upsert(status='installing', envJson)` + `pullImage` + `runContainer`
         (`oserp-net`, restart=unless-stopped) + `updateStatus('running')`.
      5. `postInstall` adımları: `runOnce` (yeni `DockerService.runOnce`
         metodu — start + wait + log + remove, exit≠0 throw). `iam` için
         `node dist/migrate.js` aynı env + ağ ile çalıştırılır.
      6. Her geçiş `service_events`'e kayıt düşer (`install_started`,
         `install_succeeded`, `install_failed`, `post_install_migrate`).
      7. Üretilen sırlar (generated) install report'unda dönülür (UI bir
         kez gösterip kaybedebilir).
- [x] **4.3** `POST /api/services/:name/update` — yeni tag pull + container
      yeniden başlat (mevcut env korunur). `updating` → `running` veya
      `failed`. `update_started/succeeded/failed` event'leri.
      `GET /api/catalog` (kullanıcıya zarif şema, generated ve default
      flag'leri ile) ve `POST /api/catalog/:name/install` (free-form
      `POST /api/services/:name/install` da korundu).
- [x] **4.4** Tek docker network'ü: `NETWORK_NAME = 'oserp-net'`,
      orchestrator install başında `ensureNetwork` çağırır. Tüm container'lar
      `NetworkMode: 'oserp-net'` ile başlar, dahili DNS servis adıyla çalışır.
- [x] **Şema/migration**: `services.env_json TEXT NOT NULL DEFAULT '{}'`
      kolonu + `0003_services_env` migration. `ServicesRepository.getEnv` ve
      `saveEnv` yardımcıları.
- [x] **Validation**: typecheck ✅, build ✅ (17 route). Curl smoke:
      `GET /api/catalog` 200 (postgres+iam doğru), `POST /api/catalog/iam/install`
      daemon yok → 502 `connect ENOENT` (DB pollute olmuyor çünkü
      ensureNetwork ilk adımda fail), unknown catalog → 404,
      `POST /api/services/iam/update` missing tag → 400, unknown service → 404.

**Çıktı:** Tek tıkla `iam` servisi (postgres + migration + api) ayağa kalkıyor
(Docker daemon mevcutsa). Bağımlılıklar otomatik kurulur, sırlar otomatik üretilir.

---

## Faz 5 — UI (dashboard)



- [x] **5.1** Layout: sidebar (Genel Bakış, Servis Kur, Servisler, Ayarlar) + topbar
      (admin email + Çıkış). Route group `(panel)/` üzerinden tek
      `getCurrentAdmin()` guard.
- [x] **5.2** `app/setup/page.tsx` zaten Faz 2'de hazır (tek-adımlı). 5.2
      kapsamında **install sihirbazı** (`app/(panel)/install/page.tsx` +
      `components/install-wizard.tsx`) eklendi: katalog kartları, bağımlılık
      zinciri, otomatik üretilen sırlar için placeholder, kurulum sonrası
      üretilen sırların özetlenmesi.
- [x] **5.3** `app/(panel)/dashboard/page.tsx` — daemon Alert + 3 stat kart +
      servis tablosu (durum rozeti, sürüm, portlar, son başlangıç, eylemler).
      `components/service-status-badge.tsx` + `components/service-actions.tsx`
      (Detay/Güncelle/Durdur + Dialog).
- [x] **5.4** `app/(panel)/services/[name]/page.tsx` — Tabs (Env/Olaylar/Logs);
      `components/env-viewer.tsx` (secret-aware mask + eye toggle);
      `components/log-stream.tsx` (EventSource → `/api/services/:name/logs`,
      pause/refresh, 1000 satır tampon).
- [x] **5.5** `app/(panel)/settings/page.tsx` — oturum, DB yolu, Docker
      host/network/sürüm bilgisi, çalışma zamanı kartları.
- [x] **5.6** Tüm aksiyonlar fetch + `router.refresh()` üzerinden çalışıyor
      (sonner yerine inline Alert/error span — küçük yüzey, daha az bağımlılık).

**Çıktı:** Uçtan uca tıklanabilir backoffice deneyimi.
**Doğrulama:** `pnpm typecheck` + `pnpm build` temiz (5 yeni ƒ rota:
`/dashboard`, `/install`, `/services`, `/services/[name]`, `/settings`).
curl smoke: unauth → 307 `/login`; auth → tüm panel rotaları 200; `/` → 307
`/dashboard`; bilinmeyen servis → 404 (`notFound()`).


---

## Faz 6 — Backoffice imajı + GHCR yayınlama ✅

- [x] **6.1** `docker/backoffice.Dockerfile` (multi-stage):
      - base: `node:24-bookworm-slim` + corepack pnpm
      - build: tüm workspace'i kopyala → `pnpm install --frozen-lockfile` →
        `pnpm --filter @oserp-community/backoffice... build` (UI paketinin de
        derlenmesi için `...` syntax'ı).
      - runner: yalnızca standalone bundle (`.next/standalone`) + `.next/static`
        + `public` kopyalanır. `argon2`, `@libsql/client`, `dockerode` Next.js'in
        file tracing'i tarafından `serverExternalPackages` üzerinden otomatik
        kopyalandı.
      - `EXPOSE 8000`, `VOLUME ["/data"]`, `BACKOFFICE_DB_PATH=/data/backoffice.db`,
        `CMD ["node", "apps/backoffice/server.js"]`.
- [x] **6.2** `next.config.ts`: `output: "standalone"` + `outputFileTracingRoot`
      monorepo köküne ayarlandı (`process.cwd()` üzerinden regex ile, runtime
      `import` kullanmadan — Next.js 16'nın CJS config compiler'ı ESM `import`
      ifadeleriyle çakışıyor). Turbopack uyumu için `turbopack.root` da aynı
      yola eklendi.
- [x] **6.3** `.github/workflows/build-backoffice.yml`:
      - tetik: `push` to `main`, `paths` filtresi (`apps/backoffice/**`,
        `packages/ui/**`, Dockerfile, workflow, lockfile) + `workflow_dispatch`.
      - `docker/setup-buildx-action` + `docker/login-action` (GHCR, GITHUB_TOKEN)
        + `docker/metadata-action` (tag'ler: `latest` + `sha-<short>` + branch).
      - `docker/build-push-action@v6` + GHA cache (scope=backoffice).
      - `permissions.packages: write`, `concurrency` grubu ile aynı ref'de paralel
        build iptal edilir.
- [x] **6.4** `.github/workflows/build-api.yml` — aynı şablon, image
      `ghcr.io/uzansadik/oserp-api`, `paths` filtresi `apps/api/**` +
      `packages/{iam,sales,catalog,interfaces}/**` + `docker/api.Dockerfile`.
- [x] **6.5** Repo ayarlarında "Packages" görünür/public ayarı — manuel adım,
      GitHub UI'dan yapılır (her iki paket için Settings → Packages →
      "Change visibility" → Public).
- [x] **Validation**: `pnpm --filter @oserp-community/backoffice typecheck` ✅,
      `pnpm --filter @oserp-community/backoffice build` ✅ (standalone bundle
      `.next/standalone/apps/backoffice/server.js` + `node_modules/.pnpm/...`
      olarak doğru şekilde üretildi).

**Çıktı:** `docker pull ghcr.io/uzansadik/oserp-backoffice:latest` ve
`docker pull ghcr.io/uzansadik/oserp-api:latest` `main`'e push sonrası çalışır
hale gelir.

---

## Faz 7 — Sunucu kurulum script'i (mevcut `install.sh` güncellemesi) ✅

- [x] **7.1** `scripts/install.sh` sıfırdan yazıldı: repo klonlamıyor, `.env`
      üretmiyor, compose çalıştırmıyor. Yalnızca:
      sistem + güvenlik (ufw 22 + 8000, fail2ban, unattended-upgrades) →
      Docker Engine kurulumu → `/var/lib/oserp-backoffice` veri dizini +
      `oserp-net` ağı → `docker pull ghcr.io/uzansadik/oserp-backoffice:latest`
      → `docker run -d` (host Docker socket mount, `/data` volume, port 8000,
      restart=unless-stopped). `SKIP_SYSTEM=1` apt/güvenlik adımlarını atlar.
- [x] **7.2** Eski compose tabanlı script `scripts/install-legacy.sh` olarak
      korundu (`git mv`); aynı env değişkenleri (`REPO_URL`, `BRANCH`,
      `APP_DIR`, `API_PORT`, `POSTGRES_USER`, `POSTGRES_DB`, `SSH_PORT`,
      `JWT_ISSUER`) geçerli. Kök `docker-compose.yml` değişmedi.
- [x] **7.3** Kök `README.md` "Docker ile kurulum" bölümü güncellendi:
      yeni tek-container akışı (tablo ile env değişkenleri,
      `curl | sudo bash` örneği, güvenlik uyarısı), altında
      "Geliştirici modu (legacy compose)" alt başlığı.
      `Monorepo yapısı` bloğunda `docker/backoffice.Dockerfile` ve
      `scripts/install-legacy.sh` listelendi.

**Çıktı:** Yeni kullanıcı tek satır `curl | sudo bash` ile backoffice'i
kurar, gerisini UI'dan yapar. Eski compose akışı `install-legacy.sh` ile
hâlâ kullanılabilir.

---

## Faz 8 — Testler & kalite

- [ ] **8.1** Sunucu-tarafı birim testleri: `DockerService` (mock dockerode),
      `ServicesRepository`, auth (passwords + session).
- [ ] **8.2** Smoke: `next build` + temel sayfaların prerender'ı çalışıyor.
- [ ] **8.3** Biome lint temiz.

---

## Riskler ve açık sorular

- **Docker socket güvenliği:** Backoffice'i public bir IP'ye açmak tehlikeli.
  README'de bunu net vurguluyoruz; ileride opsiyonel olarak Tailscale / IP
  allowlist desteği eklenebilir.
- **Windows dev:** `dockerode` Windows'ta named pipe (`//./pipe/docker_engine`)
  ile çalışır; client.ts ortam algılaması yapmalı.
- **Servis dependency grafiği:** Postgres'i her servisin ayrı kurması mı, tek
  paylaşılan örnek mi? İlk versiyonda tek `postgres` servisi, her bağlama
  ayrı database adı.
- **Backup/restore:** SQLite + pgdata volume yedeklemesi sonraki bir faz olabilir.

---

## Önerilen sıra

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`

Her faz tamamlanınca:
1. `pnpm --filter @oserp-community/backoffice build` yeşil
2. `pnpm --filter @oserp-community/backoffice typecheck` yeşil
3. Bu dosyada ilgili kutucukları `[x]` işaretle
4. Commit + push
