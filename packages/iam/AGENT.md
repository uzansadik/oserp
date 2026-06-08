# IAM Context — Agent Guide (AGENT.md)

> Bu doküman `@oserp-community/iam` paketinde çalışan otomatik ajanlar ve geliştiriciler için
> bağlam (context) rehberidir. Paketin DDD katmanlarını, konvansiyonlarını, build/test komutlarını
> ve event-driven mimari yaklaşımını özetler.

---

## 1. Amaç ve Kapsam

IAM (Identity & Access Management) bounded context'i; kimlik, kimlik doğrulama ve yetkilendirme
sorumluluğunu taşır. Domain dili (Ubiquitous Language) şu kavramlar etrafında kurulur:

- **User** — sistemdeki kişi/kimlik.
- **UserCredential** — kullanıcının parola (hash) bilgisi.
- **Role** — yetki kümesi; sistem rolü veya şirkete özel rol olabilir.
- **Permission** — `module.resource.action` formatında atomik yetki.
- **Membership** — kullanıcı ↔ şirket (company) ↔ rol ilişkisi.
- **Session** — oturum / refresh yaşam döngüsü.
- **ApiCredential** — makine-makine erişimi için API anahtarı/secret.

Bu paket framework'ten bağımsızdır. HTTP sunucusu (Fastify) `apps/api` altında yaşar ve bu paketi
import ederek route/controller bağlar.

---

## 2. Katmanlı Mimari (DDD)

```
src/
  domain/          # İş kuralları. Dış bağımlılık YOK (framework, db, http yok).
    entities/      # Kimliği olan nesneler + AggregateRoot
    aggregates/    # Tutarlılık sınırları (consistency boundary), domain event üretir
    value-objects/ # Değişmez (immutable), kimliksiz değerler
    events/        # Domain event'leri (geçmiş zaman: UserCreated, RoleAssigned...)
    repositories/  # (kullanılmıyor) — repo arayüzleri application/ports altında toplanır
    services/      # Domain service'leri (birden çok aggregate'i ilgilendiren kural)
  application/     # Use-case orkestrasyonu (CQRS). Domain'i kullanır, altyapıyı bilmez.
    commands/      # Yazma niyetleri (CreateUserCommand...)
    queries/       # Okuma niyetleri (GetUserByIdQuery...)
    handlers/      # Command/Query handler'ları (use-case'ler)
    ports/         # Tüm dış arayüzler: repository port'ları, hasher, clock, eventbus, token...
    policies/      # Yetki/erişim politikaları (authorization)
  infrastructure/  # Port'ların somut implementasyonları (adapter)
    persistance/   # Drizzle ORM: db, schemas, mappers, repositories
    password/      # Argon2 parola hash adapter'ı
    crypto/        # Şifreleme yardımcıları
    email/         # E-posta gönderim adapter'ı
    event-store/   # Event yayınlama / outbox / dispatcher altyapısı
    token/         # JWT / token üretim-doğrulama adapter'ı
  interfaces/      # Paylaşılan teknik arayüzler (IDomainEvent...)
  api/             # (planlanan) router + controller + handler (HTTP taşıma katmanı)
  index.ts         # Paket public barrel
```

### Bağımlılık yönü (içe doğru)
`api → application → domain` ve `infrastructure → (application ports / domain)`.
Domain hiçbir üst katmanı import etmez.

---

## 3. Konvansiyonlar

- **Dil/Runtime**: TypeScript (ESNext, `moduleResolution: Bundler`), strict mode.
  `exactOptionalPropertyTypes` ve `noUncheckedIndexedAccess` açık → dizi indeks erişiminde
  `undefined` daima ele alınmalı.
- **Path alias**: `@oserp-community/iam/*` → `./src/*` (bkz. `tsconfig.json`).
  Paket içi import'larda bu alias veya göreli yol kullanılır.
- **Value Object**: `private constructor` + statik `create(...)` factory + validasyon.
  Değişmez; `equals()` ve `getValue()`/`value` accessor sağlar.
- **Entity**: davranışı kapsüller; alanlar `private`. Dışarıya getter ile açılır.
- **Aggregate Root**: `AggregateRoot`'tan türer; durum değişiminde `addDomainEvent()` çağırır.
  Event'ler `getDomainEvents()` ile toplanıp `clearDomainEvents()` ile temizlenir.
- **Domain Event**: `IDomainEvent` implement eder (`occurredOn: Date`), geçmiş zaman isimli,
  değişmez ve serileştirilebilir veri taşır.
- **Hata yönetimi**: domain ihlalleri anlamlı `Error` (ileride tipli domain error) fırlatır.
- **Lint/format**: Biome (`biome.json`). Tek tırnak, 2 boşluk girinti.
- **Test**: Vitest. Test açıklamaları Türkçe yazılıyor (mevcut konvansiyon).
  Testler `_test/` altında `unit/` olarak organize.

---

## 4. Build, Test, Geliştirme

> Monorepo kökünde `pnpm` + Turbo kullanılır.

```powershell
# IAM paketine geç
Set-Location packages/iam

# Derleme (tsup → dist, ESM + d.ts)
pnpm build

# Testler
pnpm test                 # vitest (watch kapalı tek seferlik turbo ile değişebilir)
pnpm vitest run           # izole tek seferlik çalıştırma
pnpm vitest run <dosya>   # tek test dosyası
pnpm test:coverage        # kapsam raporu
```

- **tsup entry**: `src/index.ts`, `src/domain/index.ts` (bkz. `tsup.config.ts`).
- `drizzle-orm`, `kafkajs`, `postgres`, `zod` bundle'a dahil **edilmez**; tüketen uygulama sağlar.

---

## 5. Event-Driven Yaklaşım

- Aggregate'ler durum değişiminde **domain event** üretir.
- Application handler'ları işlem (transaction) tamamlandığında bu event'leri toplar ve bir
  **EventBus port'u** üzerinden yayınlar (`infrastructure/event-store`).
- İlk iterasyon: **in-memory EventBus** + **Transactional Outbox iskeleti** (event'ler aynı DB
  transaction'ında `iam_outbox` tablosuna yazılır). Ayrı publisher daha sonra `kafkajs` ile
  outbox'ı drenaj edip yayınlar.

## 5.1. Karar Kayıtları (bu iterasyon)

- **Repository port'ları** `application/ports` altında durur (Permission deseni). `domain/repositories` kullanılmaz.
- **Validasyon**: API/application giriş DTO'ları `zod` ile doğrulanır; iş kuralları VO/Entity'de kalır.
- **Token**: `JWT` access token + opaque refresh token; oturum durumu `Session` aggregate'inde DB'de.
- **HTTP**: Fastify; `apps/api` minimal app, IAM router'ını mount eder.

---

## 6. Persistence (Drizzle)

- Bağlantı: `infrastructure/persistance/db.ts` (`DATABASE_URL` env).
- Şemalar: `infrastructure/persistance/schemas/*` (tablo adları `iam_*` öneki).
- Mapper'lar domain ↔ persistence dönüşümünü yapar (`*Mapper.ts`).
- Repository implementasyonları port arayüzlerini gerçekler (`Drizzle*Repository.ts`).

---

## 7. Mevcut Durum / Boşluklar (özet)

| Alan | Durum |
|------|-------|
| `Permission` entity + VO'lar + repo/mapper/schema | ✅ büyük ölçüde tam |
| `User` entity | ⚠️ var ama test imzasıyla uyumsuz |
| `Role` entity | ⚠️ iskelet; `RoleStatus` VO hatalı (UserStatus kopyası) |
| `UserCredential` | ⚠️ temel |
| Aggregates (User/Role/Membership/Session/ApiCredential) | ❌ stub/boş |
| Domain events (UserCreated dışında) | ❌ eksik |
| `domain/repositories`, `domain/services` | ❌ boş |
| Application (commands/queries/handlers/policies) | ❌ boş |
| `infrastructure/event-store`, `crypto`, `email`, `token` | ❌ boş |
| `src/api` (router/controller) + `apps/api` (Fastify) | ❌ yok |
| `domain/index.ts`, `value-objects/index.ts` barrels | ⚠️ eksik export |

> Detaylı yol haritası için bkz. `PLAN.md`.
