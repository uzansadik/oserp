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

## Faz 4 — Servis kataloğu ve kurulum akışı

- [ ] **4.1** Statik bir servis kataloğu (`src/server/catalog.ts`):
      ```ts
      export const SERVICE_CATALOG = {
        iam: {
          image: 'ghcr.io/uzansadik/oserp-api',
          ports: { 3000: 3000 },
          envSpec: ['DATABASE_URL', 'JWT_SECRET'],
          dependsOn: ['postgres'],
          postInstall: [{ kind: 'migrate', image: '...', command: ['node', 'apps/api/dist/migrate.js'] }],
        },
        postgres: {
          image: 'postgres',
          tag: '16-bookworm',
          ports: {},  // sadece iç ağ
          envSpec: ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'],
          volumes: ['oserp-pgdata:/var/lib/postgresql/data'],
        },
        // ileride: catalog, sales, ...
      } as const;
      ```
- [ ] **4.2** "Install service" akışı:
      1. Gerekli env değişkenlerini formdan al, **rastgele sırlar** üret
         (DB parolası, JWT_SECRET).
      2. Bağımlılıkları (örn. postgres) önce kur.
      3. `pull → run → (varsa) post-install migrate container`.
      4. `services` tablosuna kaydet, `service_events` logla.
- [ ] **4.3** Versiyon güncelleme: `POST /api/services/:name/update` → yeni
      tag pull → eski container'ı durdur → yeniyi başlat.
- [ ] **4.4** Tek bir docker network'ü (`oserp-net`) oluştur ve tüm servisleri
      buna bağla, böylece `iam` → `postgres` host adı `postgres` üzerinden
      ulaşır.

**Çıktı:** Tek tıkla `iam` servisi (postgres + migration + api) ayağa kalkıyor.

---

## Faz 5 — UI (dashboard)



- [ ] **5.1** Layout: sidebar (Servisler, Ayarlar, Çıkış) + topbar.
- [ ] **5.2** `app/setup/page.tsx` — admin oluşturma sihirbazı (3 adım: hesap,
      registry onayı, ilk servis seçimi).
- [ ] **5.3** `app/dashboard/page.tsx` — servis listesi (tablo): durum rozeti,
      sürüm, port, eylemler (başlat/durdur/güncelle/log).
- [ ] **5.4** `app/services/:name/page.tsx` — detay: env'ler (maskeli), son
      olaylar, canlı log akışı.
- [ ] **5.5** `app/settings/page.tsx` — registry, network, backup.
- [ ] **5.6** Eylemler için server actions / route handler entegrasyonu, toast
      ile geri bildirim.

**Çıktı:** Uçtan uca tıklanabilir backoffice deneyimi.

---

## Faz 6 — Backoffice imajı + GHCR yayınlama

- [ ] **6.1** `docker/backoffice.Dockerfile` (multi-stage):
      - base: `node:24-bookworm-slim` + corepack pnpm
      - build: tüm workspace'i kopyala → `pnpm install --frozen-lockfile`
        → `pnpm --filter @oserp-community/backoffice build`
      - runner: yalnızca `next start -p 8000` için gerekli dist + node_modules.
      - `EXPOSE 8000`, `CMD ["node", "apps/backoffice/.next/standalone/server.js"]`
        (Next.js `output: 'standalone'` ile).
- [ ] **6.2** `next.config.ts`: `output: 'standalone'`.
- [ ] **6.3** `.github/workflows/build-backoffice.yml`:
      - tetik: `push` to `main`, `paths: ['apps/backoffice/**', 'packages/ui/**']`
      - `docker/login-action` → ghcr.io (GITHUB_TOKEN)
      - `docker/build-push-action` → `ghcr.io/uzansadik/oserp-backoffice:latest`
        + tag olarak commit SHA.
- [ ] **6.4** `.github/workflows/build-api.yml` — aynısı `oserp-api` için
      (`docker/api.Dockerfile`).
- [ ] **6.5** Repo ayarlarında "Packages" görünür/public ayarı.

**Çıktı:** `docker pull ghcr.io/uzansadik/oserp-backoffice:latest` çalışıyor.

---

## Faz 7 — Sunucu kurulum script'i (mevcut `install.sh` güncellemesi)

- [ ] **7.1** `scripts/install.sh`'i sadeleştir: artık repo klonlamaya gerek yok,
      yalnızca **backoffice container'ını çalıştırır** (Docker socket + volume
      mount + port 8000).
- [ ] **7.2** Eski compose tabanlı kurulumu `scripts/install-legacy.sh` olarak
      koru (geliştirici modu).
- [ ] **7.3** README (kök) — yeni akışı belgelendir: "sunucuya tek komutla
      backoffice kur, gerisini tarayıcıdan yap".

**Çıktı:** Yeni kullanıcı tek satır `curl | sudo bash` ile backoffice'i
kurar, gerisini UI'dan yapar.

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
