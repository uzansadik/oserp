# syntax=docker/dockerfile:1
#
# API servisi imaji (@oserp-community/api)
# Build context: repo koku. Compose'dan `docker/api.Dockerfile` ile referans alinir.

# ---- temel pnpm tabani ----
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- bagimliliklar + build ----
FROM base AS build
# argon2 gibi native modullerin derlenebilmesi icin gerekli araclar
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

# ---- production runtime ----
FROM base AS runner
ENV NODE_ENV=production
# Derlenmis workspace'i oldugu gibi kopyala (workspace symlink'leri korunur)
COPY --from=build /app /app

EXPOSE 3000

# Saglikli baslangic icin migration'i ayri serviste calistiriyoruz (compose).
# Varsayilan komut API sunucusunu baslatir.
CMD ["node", "apps/api/dist/server.js"]
