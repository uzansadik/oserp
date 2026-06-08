# @oserp-community/backoffice

Oserp Community platformunun **kontrol paneli** — diğer servis container'larından
(iam, catalog, …) tamamen bağımsız, host'a en önce kurulan ve geri kalanı bu
arayüzden yöneten Next.js tabanlı web uygulaması.

> Bu paket gelişim aşamasındadır. Mevcut sürümünde yalnızca temel iskelet ve plan
> dosyaları bulunur; özellikler [PLAN.md](./PLAN.md) sırasıyla uygulanır.

---

## Ne işe yarar?

Backoffice; sunucuya kurulduktan sonra **tarayıcı üzerinden**:

- Hangi git/registry adresinin kullanılacağını yapılandırır
- GitHub Container Registry'den (GHCR) `oserp-api`, `oserp-catalog` gibi
  servislerin **`latest` imajlarını pull eder**
- PostgreSQL container'ını başlatır, **veritabanı migration'larını** tetikler
- Servisleri başlatır/durdurur, log'larını gösterir
- Servis sağlık durumunu ve sürümlerini izler

Kısacası: bir sunucuyu sıfırdan production'a almak için tek yapman gereken
**backoffice'i kurmak**; geri kalan tüm Oserp servisleri buradan tıklamayla
gelir.

---

## Mimari özet

| Konu                   | Tercih                                                |
| ---------------------- | ----------------------------------------------------- |
| Çalışma zamanı         | Next.js 15 (App Router) + TypeScript                  |
| UI primitives          | [`@oserp-community/ui`](../../packages/ui) (shadcn/ui)|
| Stil                   | Tailwind CSS v4                                       |
| Container yönetimi     | Host'un `/var/run/docker.sock`'u + `dockerode`        |
| Servis imajları        | GHCR (`ghcr.io/uzansadik/oserp-*:latest`)             |
| Durum saklama          | SQLite (volume'da `backoffice.db`)                    |
| Kimlik doğrulama       | İlk açılışta admin kurulum sihirbazı                  |
| Port                   | **8000** (host)                                       |

> **Güvenlik uyarısı:** Backoffice container'ı Docker socket'ini mount eder; bu
> mount edildiği container'a host üzerinde root yetkisi verir. Bu nedenle
> backoffice **her zaman** kimlik doğrulamasının ardında çalışmalı, dış dünyaya
> doğrudan açılmamalı (önünde reverse proxy + IP allowlist önerilir).

---

## Kurulum (sunucuda, tek adım)

Ubuntu LTS bir sunucuda Docker yüklüyse:

```bash
# 1. Backoffice imajını çek
docker pull ghcr.io/uzansadik/oserp-backoffice:latest

# 2. Veri dizinini hazırla
sudo mkdir -p /var/lib/oserp-backoffice
sudo chown 1000:1000 /var/lib/oserp-backoffice

# 3. Çalıştır (8000 portunda)
docker run -d --name oserp-backoffice \
  --restart unless-stopped \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/oserp-backoffice:/data \
  ghcr.io/uzansadik/oserp-backoffice:latest
```

Tarayıcıdan `http://<sunucu-ip>:8000` adresini aç. İlk istekte **admin kurulum
sihirbazı** açılır:

1. Yönetici e-postası ve parolası belirle
2. Kullanılacak registry'yi onayla (`ghcr.io/uzansadik/oserp-*`)
3. Kurulacak servisleri seç (`iam`, ilerde `catalog` …)
4. "Kur" → backoffice imajları pull edip migration ve servisleri başlatır

Sonraki erişimlerde aynı kullanıcı ile giriş yapılır.

---

## Geliştirme (yerel)

```bash
# Bağımlılıkları kur (kök dizinden)
pnpm install

# Backoffice'i dev modda çalıştır (port 8000)
pnpm --filter @oserp-community/backoffice dev
```

`http://localhost:8000` adresinden erişilir.

> Yerel geliştirmede Docker socket erişimi gerekir; mevcut işletim sisteminde
> Docker Desktop / Docker Engine kurulu olmalıdır. Socket bulunmazsa yönetim
> sayfaları "Docker bulunamadı" durumunu gösterir.

---

## UI bileşenleri ekleme

Tüm shadcn primitives `@oserp-community/ui` paketinde toplanır. Yeni bir
bileşen eklemek için **apps/backoffice** dizinindeyken:

```bash
cd apps/backoffice
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add button input form
```

CLI bileşeni otomatik olarak `packages/ui/src/components/` altına kurar ve
import yollarını ayarlar. **`packages/ui` içine elle dosya eklenmez** — yalnızca
`shadcn add` ile yönetilir.

Kullanım:

```tsx
import { Button } from '@oserp-community/ui/components/button';
import { Card } from '@oserp-community/ui/components/card';
```

---

## Klasör yapısı (hedef)

```
apps/backoffice/
├─ src/
│  ├─ app/                # Next.js App Router sayfaları
│  │  ├─ setup/           # ilk açılış sihirbazı
│  │  ├─ login/           # giriş
│  │  ├─ dashboard/       # servis durum/log/kontrol
│  │  └─ api/             # Route handler'lar (docker, auth, services)
│  ├─ server/             # docker, db, auth iş mantığı (server-only)
│  └─ lib/                # paylaşılan yardımcılar
├─ public/
├─ components.json        # shadcn yapılandırması
├─ next.config.ts
├─ package.json
├─ README.md              # bu dosya
└─ PLAN.md                # uygulama planı
```

---

## Sonraki adımlar

Geliştirme planı için → [PLAN.md](./PLAN.md)
