# AGENT.md — Inventory Context (AI-agen için çalışma notu)

> Bu dosya, AI/ajan destekli geliştirme için bağlam özetini tutar. Kısa ve
> güncel tut.

## Bağlam

- **DDD + CQRS + Event-Driven** monorepo
- Paket: `packages/inventory/` (IAM ile aynı yapı)
- Composition root: `src/container.ts` (`createInventoryContainer`)
- Persistence: Drizzle ORM + Postgres
- Outbox pattern: domain event'ler `inv_outbox`'a yazılır, `OutboxPublisher` drene eder
- HTTP API: Fastify, `apps/api` mount eder (`/inventory` prefix)

## Klasör yapısı

```
src/
├── domain/         pure business logic, no I/O
│   ├── errors/     (DomainError tabanı + Validation/NotFound/InvalidState/Conflict)
│   ├── value-objects/  (immutable, private constructor + static create + equals)
│   ├── events/     (DomainEvent tabanı, occurredOn, eventName)
│   ├── entities/   (AggregateRoot + Product)
│   └── aggregates/ (alias re-export)
├── application/    use-case orchestration
│   ├── commands/   (zod şemalar + type export)
│   ├── queries/    (zod şemalar + type export)
│   ├── handlers/   (ProductHandlers + ProductQueryHandlers)
│   ├── ports/      (ProductRepositoryPort, UnitOfWorkPort, EventBusPort, OutboxPort, ClockPort, UuidPort)
│   └── Handler.ts  (CommandHandler/QueryHandler interface)
├── infrastructure/  port implementations
│   ├── clock/SystemClock.ts
│   ├── crypto/CryptoUuidGenerator.ts
│   ├── event-store/ (InMemoryEventBus, OutboxPublisher)
│   └── persistance/ (db.ts, DrizzleUnitOfWork, DrizzleOutbox, InMemoryUoW, mappers, repositories, schemas)
├── api/
│   ├── routes/     (Fastify route registration)
│   ├── controllers/ (Command/Query → HTTP dönüşümü)
│   └── errors/httpErrorMapper.ts (DomainError → HTTP status)
├── interfaces/IDomainEvent.ts
├── container.ts    composition root
└── index.ts        barrel
```

## Yeni aggregate eklerken izlenecek adımlar

1. `domain/value-objects/` — yeni VO'lar (private ctor + static create + equals)
2. `domain/events/` — aggregate için event'ler (InventoryEventNames'a ekle)
3. `domain/entities/X.ts` — AggregateRoot'tan extend eden AR
4. `domain/aggregates/X.ts` — alias re-export
5. `application/ports/XRepositoryPort.ts` + `application/ports/index.ts` export
6. `application/ports/UnitOfWorkPort.ts` → context'e X'i ekle
7. `application/commands/XCommands.ts` + `application/queries/XQueries.ts` (zod)
8. `application/handlers/XHandlers.ts` (Command/Query pattern)
9. `infrastructure/persistance/schemas/` (Drizzle pgTable)
10. `infrastructure/persistance/mappers/XMapper.ts` (DB ↔ Domain)
11. `infrastructure/persistance/repositories/DrizzleXRepository.ts` + InMemoryXRepository
12. `infrastructure/persistance/DrizzleUnitOfWork.ts` → buildContext'e ekle
13. `infrastructure/persistance/InMemoryUnitOfWork.ts` → aynı
14. `api/controllers/xController.ts` + `api/routes/xRoutes.ts`
15. `api/routes/inventoryRouter.ts` → registerXRoutes(app, container)
16. `container.ts` → commands/queries objesine handler'ları ekle
17. `_test/unit/entities/X.test.ts` (invariants, events)
18. `_test/unit/application/XHandler.test.ts` (use-case davranışı)
19. `README.md` + `AGENT.md` güncelle

## Convention'lar (IAM ile uyumlu)

- VO'lar `private constructor` + `static create` + `get value()/getValue()` + `static equals(a, b)`
- Aggregate'ler `AggregateRoot` extend eder; `addDomainEvent()` ile event ekler; `pullDomainEvents()` ile outbox'a gönderir
- Command handler'lar `cmd = schema.parse(input)` ile validate eder
- Handler'lar `uow.execute(async (ctx) => ...)` içinde aggregate'i load → mutate → save → outbox'a event yazar
- Hata yönetimi: domain `DomainError` throw eder → API katmanı `httpErrorMapper` ile HTTP status'a map eder
- ESLint/Biome: repo kökündeki `biome.json` extend edilir
- Test: vitest, `@oserp-community/inventory/...` alias import

## Çalıştırma

```bash
cd packages/inventory
pnpm test                # 39 test
pnpm build              # tsup ile dist/ üret
pnpm db:generate        # migration üret
```

## Yapılanlar (Faz 1)

- Product aggregate (SKU unique, status state machine, discontinued guard, barcode collection)
- 6 domain event
- 7 command handler + 3 query handler
- Drizzle schema (3 tablo) + Drizzle repo + InMemory repo
- DrizzleUoW + InMemoryUoW
- 10 HTTP uç
- 39/39 unit test yeşil
- apps/api mount tamam
