# IAM Context — Uygulama Planı (PLAN.md)

> DDD + CQRS + Event-Driven yaklaşımıyla `@oserp-community/iam` bağlamının tamamlanması.
> Sıra, bağımlılıklara göre düzenlenmiştir: önce temel (foundation), sonra domain, sonra
> application, sonra infrastructure/persistence, en sonra HTTP (api) ve `apps/api`.

## Mimari Kararlar (özet)
- Repository **port'ları** `application/ports` altında (Permission deseni korunur).
- Event yayınlama: **in-memory EventBus** + **Transactional Outbox** iskeleti (`iam_outbox`), sonra KafkaJS publisher.
- Tüm aggregate'ler kapsamda: **User+UserCredential, Role+Permission, Membership, Session, ApiCredential**.
- Token: **JWT access** + **opaque refresh**; oturum durumu `Session` aggregate'inde.
- Validasyon: **zod** (DTO/giriş). İş kuralları VO/Entity'de.
- HTTP: **Fastify**; `apps/api` IAM router'ını mount eder.

---

## Faz 0 — Temel / Hijyen (foundation)
Amaç: barrel'lar, ortak tipler ve mevcut tutarsızlıkları gidermek. Diğer her şey buna dayanır.

- [x] **0.1** `domain/value-objects/index.ts` eksik export'ları tamamla (CompanyId, PasswordHash, Permission*, RoleId, RoleName, RoleStatus, UserStatus).
- [x] **0.2** `RoleStatus.ts` hatasını düzelt — `active|inactive` VO; `Role.ts` doğru `RoleStatus` kullanıyor.
- [x] **0.3** `domain/index.ts` barrel'ını doldur (entities + value-objects + errors + events).
- [x] **0.4** `User` entity'yi testlerin sözleşmesine hizala: `create(id|null, name, surname, email, username)`, public `id/person/email/userName`, `Person` VO. Testler yeşil (17/17).
- [x] **0.5** Ortak `DomainError` taban sınıfı (`domain/errors/`) + `InvalidStateError`/`NotFoundError`/`ValidationError`.
- [ ] **0.6** `Result`/`Guard` yardımcıları (opsiyonel) veya throw-temelli sözleşmeyi netleştir.

## Faz 1 — Domain: Value Objects tamamlama
Amaç: eksik VO'ları eklemek, mevcutları sağlamlaştırmak.

- [x] **1.1** `Password` (raw policy: min uzunluk, küçük/büyük harf, rakam) VO — hash'lenmeden önce doğrulama.
- [x] **1.2** `RefreshToken` / `TokenId` ve `SessionId` VO'ları.
- [x] **1.3** `ApiKeyId`, `ApiKeyPrefix`, `ApiKeySecretHash` VO'ları.
- [x] **1.4** `MembershipId` VO.
- [ ] **1.5** `IpAddress`, `UserAgent` (Session metadata) — opsiyonel (ertelendi).
- [x] **1.6** Tüm VO'lar `equals()` ve `getValue()/value` tutarlılığı; `noUncheckedIndexedAccess` uyumu. Testler yeşil (34/34).

## Faz 2 — Domain: Entities & Aggregates
Amaç: tutarlılık sınırlarını (aggregate) kurmak ve domain event üretimini bağlamak.

- [x] **2.1 UserAggregate**: `entities/User` aggregate root oldu. `verifyEmail`, `activate/deactivate/suspend`, `changeStatus`. Event'ler: `UserCreated`, `UserEmailVerified`, `UserStatusChanged`. (`aggregates/UserAggregate` alias re-export)
- [x] **2.2 RoleAggregate**: `entities/Role` AggregateRoot'a yükseltildi; izin kümesi yönetimi. `create/reconstitute/rename/assignPermission/revokePermission/deactivate`. Event'ler: `RoleCreated`, `RoleRenamed`, `RolePermissionAssigned/Revoked`, `RoleDeactivated`.
- [x] **2.3 MembershipAggregate**: `grant/assignRole/revokeRole/suspend` + event'ler. Sistem/şirket scope kuralları `RoleAssignmentService`'te.
- [x] **2.4 SessionAggregate**: `start/refresh/revoke/isExpired/isActive` + event'ler.
- [x] **2.5 ApiCredentialAggregate**: `issue/rotate/revoke` + event'ler.
- [x] **2.6** `AggregateRoot` tabanlı; tüm aggregate'lerde `create`/`reconstitute` deseni standardize edildi.

## Faz 3 — Domain: Events & Services
Amaç: event kataloğu ve çok-aggregate'li kuralları toplamak.

- [x] **3.1** Her aggregate için `domain/events/*` event sınıfları (`DomainEvent` tabanı, `eventName`+`aggregateId`, geçmiş zaman).
- [x] **3.2** `events/index.ts` barrel + `IamEventNames` sabitleri (outbox/topic eşlemesi için).
- [x] **3.3 Domain Services**: `PermissionEvaluator` (joker destekli izin değerlendirme), `PasswordPolicyService`, `RoleAssignmentService`.

## Faz 4 — Application: Ports
Amaç: use-case'lerin ihtiyaç duyduğu tüm soyutlamalar.

- [x] **4.1** Repository port'ları: `UserRepositoryPort`, `UserCredentialRepositoryPort`, `RoleRepositoryPort`, `MembershipRepositoryPort`, `SessionRepositoryPort`, `ApiCredentialRepositoryPort` (`PermissionRepositoryPort` mevcut).
- [x] **4.2** `EventBusPort` (publish/publishAll), `OutboxPort` (enqueue + `OutboxRecord`).
- [x] **4.3** `TokenServicePort` (JWT imzala/doğrula), `RefreshTokenHasherPort`.
- [x] **4.4** `ClockPort`, `UuidPort` (test edilebilirlik için deterministik bağımlılıklar).
- [x] **4.5** `UnitOfWorkPort` + `UnitOfWorkContext` (aggregate kaydı + outbox atomikliği). `ports/index.ts` barrel eklendi.

## Faz 5 — Application: Commands, Queries, Handlers (CQRS) ✅
Amaç: use-case orkestrasyonu. Her handler: load → mutate → persist (UoW) → outbox'a event yaz.

### Commands + Handlers
- [x] **5.1** `RegisterUser`, `ChangePassword`, `VerifyEmail`, `ChangeUserStatus` (zod şemaları + handler'lar + testler).
- [x] **5.2** `CreateRole`, `RenameRole`, `AssignPermissionToRole`, `RevokePermissionFromRole`, `DeactivateRole` (zod + handler'lar + testler).
- [x] **5.3** `CreatePermission`, `GrantMembership`, `AssignRoleToMember`, `RevokeRoleFromMember`, `SuspendMembership` (zod + handler'lar + testler).
- [x] **5.4** `Login` (kimlik doğrula → Session başlat → access+refresh üret), `RefreshSession`, `Logout` (zod + handler'lar + testler).
- [x] **5.5** `IssueApiCredential`, `RotateApiCredential`, `RevokeApiCredential` (zod + handler'lar + testler).

### Queries + Handlers
- [x] **5.6** `GetUserById`, `GetUserByEmail`, `ListUsers` (zod + handler'lar + testler).
- [x] **5.7** `GetRoleById`, `ListRoles`, `ListPermissions` (zod + handler'lar + testler).
- [x] **5.8** `GetEffectivePermissions(userId, companyId)` (authorization okuması + testler).

### Policies
- [x] **5.9** `application/policies`: `AuthorizationPolicy` (`PermissionEvaluator` + joker destekli; `can/canAll/canAny/authorize/authorizeAll`). `ForbiddenError` eklendi.

### DTO + Validasyon
- [x] **5.10** Her command/query için `zod` şeması + tip türetme (`z.infer`). Tüm use-case'ler tamamlandı.

> Test altyapısı: `_test/support/InMemoryUnitOfWork.ts` (tüm repo'lar + outbox + `FakePasswordHasher`).

## Faz 6 — Infrastructure: Persistence (Drizzle)
Amaç: tüm aggregate'ler için şema + mapper + repository.

- [x] **6.1** Şemalar: `iam_users`, `iam_user_credentials`, `iam_roles`, `iam_role_permissions`, `iam_memberships`, `iam_membership_roles`, `iam_sessions`, `iam_api_credentials`, `iam_outbox`. (`iam_permissions` mevcut.)
- [x] **6.2** `schemas/index.ts` tüm tabloları export etsin (db `schema` çözümlemesi için).
- [x] **6.3** Mapper'lar: her aggregate için `*Mapper.ts` (domain ↔ persistence; `reconstitute` ile).
- [x] **6.4** Repository implementasyonları: `DrizzleUserRepository`, `DrizzleRoleRepository`, `DrizzleMembershipRepository`, `DrizzleSessionRepository`, `DrizzleApiCredentialRepository`.
- [x] **6.5** `DrizzleUnitOfWork` — transaction içinde aggregate kaydı + `iam_outbox` insert.
- [x] **6.6** `drizzle.config.ts` + migration üretimi (`drizzle-kit`). `apps/api` veya paket script'i ile migrate.

## Faz 7 — Infrastructure: Event Store / Crypto / Token / Email
- [x] **7.1** `event-store/InMemoryEventBus` (`EventBusPort`) — handler testleri ve dev için.
- [x] **7.2** `event-store/OutboxRepository` + `OutboxPublisher` iskeleti (KafkaJS bağlanacak nokta, başta no-op/log).
- [x] **7.3** `token/JwtTokenService` (`TokenServicePort`) — access token imzala/doğrula; `RefreshTokenHasher` (argon2/sha256).
- [x] **7.4** `crypto/` — mevcut `crypto-utils` üzerinden API secret hash/encrypt yardımcıları.
- [x] **7.5** `email/` — `EmailSenderPort` + dev `ConsoleEmailAdapter` (e-posta doğrulama akışı için).
- [x] **7.6** Composition root: `infrastructure/container.ts` (port → adapter bağlama; basit DI).

## Faz 8 — Interface: `src/api` (HTTP taşıma, framework-agnostik mümkün olduğunca)
Amaç: router + controller + handler katmanı; Fastify plugin olarak dışa açılır.

- [x] **8.1** `api/controllers/*` — request → command/query map, response şekillendirme.
- [x] **8.2** `api/routes/*` — Fastify route tanımları (zod şema validasyonu ile).
- [x] **8.3** `api/iamRouter.ts` (Fastify plugin) — auth (`/auth/login|refresh|logout`), users, roles, permissions, memberships, api-credentials route grupları.
- [x] **8.4** `api/middlewares` — `authenticate` (JWT doğrula), `authorize` (permission policy).
- [x] **8.5** `api/errors` — domain error → HTTP status eşlemesi (404/409/401/403/400).
- [x] **8.6** `index.ts` ve `package.json#exports` içine `./api` alt-yolunu ekle (apps/api import edebilsin).

## Faz 9 — `apps/api` (Fastify uygulaması)
- [x] **9.1** `apps/api` paketi: `package.json`, `tsconfig.json`, `tsup`/`tsx` dev script.
- [x] **9.2** `server.ts` — Fastify instance, env yükleme (`dotenv`), `@oserp-community/iam` `iamRouter`'ını mount.
- [x] **9.3** Composition: IAM container'ı (repos, db, token, eventbus) kur ve router'a enjekte et.
- [x] **9.4** Sağlık ucu (`/health`), graceful shutdown, hata serileştirme.
- [x] **9.5** `pnpm-workspace.yaml` zaten `apps/*` içeriyor — bağımlılıkları bağla.

## Faz 10 — Testler & Kalite
- [x] **10.1** Domain unit testleri: her VO + aggregate invariant'ları + event üretimi (Türkçe açıklamalar).
- [x] **10.2** Application handler testleri: in-memory repo + in-memory eventbus ile use-case akışları.
- [x] **10.3** Mapper round-trip testleri (domain → persistence → domain).
- [x] **10.4** API entegrasyon testleri (Fastify `inject`) — auth + yetki senaryoları.
- [x] **10.5** Biome lint temiz; `pnpm build` (tsup) ve `tsc` hatasız.

---

## Önerilen Çalışma Sırası (kritik yol)
1. Faz 0 (temel) → 2. Faz 1 (VO) → 3. Faz 2/3 (aggregate+event) →
4. Faz 4 (ports) → 5. Faz 5 (use-case) → 6. Faz 6/7 (persistence+altyapı) →
7. Faz 8 (api) → 8. Faz 9 (apps/api) → 9. Faz 10 (test) boyunca süregelen.

> Her faz sonunda `pnpm vitest run` ve `pnpm build` yeşil olmalı.

## Açık Konular / İleride Karar
- Multi-tenant izolasyon: `CompanyId` her sorguda zorunlu mu (RLS / scope)?
- Permission seed stratejisi (sistem izinleri nasıl yüklenecek)?
- Refresh token rotation + reuse-detection politikası.
- Outbox publisher'ın gerçek KafkaJS entegrasyonu ve topic adlandırma şeması.
