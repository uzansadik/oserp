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
| Framework             | Next.js 15 (App Router, TypeScript, React 19)                 |
| UI kütüphanesi        | shadcn/ui → `@oserp-community/ui` (Tailwind v4)               |
| Container kontrolü    | Docker socket mount + `dockerode`                             |
| Servis imajları       | GHCR (`ghcr.io/uzansadik/oserp-*:latest`) + GitHub Actions    |
| Durum saklama         | SQLite (`better-sqlite3`) `/data/backoffice.db`               |
| Kimlik doğrulama      | İlk açılışta admin sihirbazı, sonrasında oturum cookie'si     |
| Port                  | 8000 (host + container)                                       |

---

## Faz 0 — Scaffold (shadcn monorepo entegrasyonu)

> **Bu faz mevcut workspace ile çakışan bir alana dokunur; dikkatli yapılmalı.**
> shadcn `init --monorepo` yeni bir monorepo oluşturur, bizimki mevcut bir pnpm
> workspace. Bu yüzden geçici bir dizinde init edip üretilen yapıyı entegre
> edeceğiz.

- [ ] **0.1** Geçici bir dizinde scaffold üret:
      ```bash
      cd $env:TEMP
      pnpm dlx shadcn@latest init --preset bJMSkfGi --template next
      ```
- [ ] **0.2** Üretilen `apps/web` → `community/apps/backoffice` olarak taşı.
      `package.json` adı `@oserp-community/backoffice`.
- [ ] **0.3** Üretilen `packages/ui` → `community/packages/ui` olarak taşı.
      `package.json` adı `@oserp-community/ui`. Hiçbir kaynak dosyaya elle
      dokunma — shadcn'in oluşturduğu yapıyı koru.
- [ ] **0.4** `apps/backoffice/components.json` içindeki workspace alias'larını
      `@workspace/ui` → `@oserp-community/ui` olarak güncelle (importlar ve
      `ui`/`utils` alias'ları).
- [ ] **0.5** `apps/backoffice/package.json#imports` ve `@oserp-community/ui`'a
      olan `workspace:*` bağımlılığını doğrula.
- [ ] **0.6** Kök `pnpm-workspace.yaml` zaten `apps/*` ve `packages/*` içerir;
      değişiklik gerekmez. `pnpm install` çalıştır.
- [ ] **0.7** Kök `turbo.json`'a yeni bir `dev`/`build` görevi eklemek gerekirse
      ekle (mevcut görevler workspace-wide çalışacağından muhtemelen
      gerekmez).
- [ ] **0.8** `apps/backoffice/package.json` script'leri:
      `dev: next dev -p 8000`, `start: next start -p 8000`, `build: next build`,
      `typecheck: tsc --noEmit`.
- [ ] **0.9** Sağlama: `pnpm --filter @oserp-community/backoffice dev` → tarayıcıda
      `http://localhost:8000` shadcn başlangıç sayfası açılmalı.

**Çıktı:** Boş Next.js + shadcn iskeleti, port 8000'de çalışıyor. UI paketi
hazır, `pnpm dlx shadcn@latest add <component>` ile bileşen eklenebilir.

---

## Faz 1 — Veri katmanı (SQLite + servisler tablosu)

- [ ] **1.1** `better-sqlite3` ve `drizzle-orm` ekle (drizzle-orm SQLite
      adapter'ı zaten ekosistemde tanıdık).
- [ ] **1.2** `src/server/db.ts` — `/data/backoffice.db` üzerinde Drizzle
      bağlantısı. Yol env (`BACKOFFICE_DB_PATH`) ile değiştirilebilir.
- [ ] **1.3** Şema (`src/server/schema.ts`):
      - `admin_users(id, email, password_hash, created_at)`
      - `services(name PK, image, current_tag, status, last_started_at)`
      - `service_events(id, service_name, kind, payload_json, at)`
- [ ] **1.4** `src/server/migrate.ts` — uygulama başlangıcında otomatik
      `drizzle-kit migrate` veya el-yazısı `init.sql` uygulaması.
- [ ] **1.5** Repository sınıfları (`AdminUsersRepository`, `ServicesRepository`).

**Çıktı:** Persistent durum yazma/okuma çalışıyor.

---

## Faz 2 — Auth (ilk açılış sihirbazı + oturum)

- [ ] **2.1** `src/server/auth/passwords.ts` — `argon2` ile hash/verify.
- [ ] **2.2** `src/server/auth/session.ts` — HttpOnly + SameSite=Strict +
      Secure cookie, opaque token, DB'de session tablosu (veya JWT HS256;
      basitlik için cookie+DB).
- [ ] **2.3** `app/setup/page.tsx` + `POST /api/setup` — `admin_users` boşsa
      e-posta + parola al, kaydet, cookie set et, dashboard'a yönlendir.
- [ ] **2.4** `app/login/page.tsx` + `POST /api/login` — credentials → session.
- [ ] **2.5** `middleware.ts` (Next.js) — `/setup` ve `/login` dışındaki
      route'larda cookie zorunlu; yoksa `/login`'a redirect. Admin yoksa
      `/setup`'a redirect.
- [ ] **2.6** `POST /api/logout`.

**Çıktı:** Backoffice'e giriş gerektiriyor; admin yoksa sihirbaz açılıyor.

---

## Faz 3 — Docker kontrolü

- [ ] **3.1** `dockerode` ekle. `src/server/docker/client.ts` — `/var/run/docker.sock`
      üzerinden bağlanır (Windows dev için `npipe` alternatifi env ile).
- [ ] **3.2** `DockerService` sınıfı:
      - `pingDaemon(): Promise<boolean>`
      - `pullImage(image: string, tag: string, onProgress)`
      - `runContainer(spec)`, `stopContainer(name)`, `removeContainer(name)`
      - `getContainerStatus(name)`, `streamLogs(name)`
- [ ] **3.3** `GET /api/docker/status` — daemon erişilebilir mi.
- [ ] **3.4** `GET /api/services` — `services` tablosu + her birinin
      `getContainerStatus` sonucu.
- [ ] **3.5** `POST /api/services/:name/install` — pull + run (aşağıdaki Faz 4
      ile birleşir).
- [ ] **3.6** `GET /api/services/:name/logs` — SSE veya WebSocket ile log akışı.

**Çıktı:** Backoffice host Docker daemon'ını okuyabilir ve yönetebilir.

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

> shadcn bileşenleri burada eklenir: `pnpm dlx shadcn@latest add card button table form input dialog toast badge`.

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
