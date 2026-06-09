# syntax=docker/dockerfile:1
#
# Backoffice imaji (@oserp-community/backoffice)
# Build context: repo koku. CI tarafindan ghcr.io/uzansadik/oserp-backoffice olarak yayinlanir.

# ---- temel pnpm tabani ----
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- bagimliliklar + build ----
FROM base AS build
# argon2, @libsql/client gibi native modullerin derlenebilmesi icin gerekli araclar
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @oserp-community/backoffice... build

# ---- production runtime ----
# Next.js `output: 'standalone'` ciktisini kullanir.
# outputFileTracingRoot repo kokune set edildigi icin standalone agaci
# `/apps/backoffice/server.js` + `/node_modules` seklinde olusur.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8000
ENV HOSTNAME=0.0.0.0
# SQLite veritabani host tarafindan mount edilen volume'a yazilir.
ENV BACKOFFICE_DB_PATH=/data/backoffice.db

# Standalone bundle (server.js + minimal node_modules + workspace symlink'leri)
COPY --from=build /app/apps/backoffice/.next/standalone ./
# Static asset'ler standalone'a otomatik kopyalanmaz.
COPY --from=build /app/apps/backoffice/.next/static ./apps/backoffice/.next/static
COPY --from=build /app/apps/backoffice/public ./apps/backoffice/public

EXPOSE 8000
VOLUME ["/data"]

CMD ["node", "apps/backoffice/server.js"]
