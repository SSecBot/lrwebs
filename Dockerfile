# syntax=docker/dockerfile:1

# ---------- 1) Bağımlılıklar ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2) Derleme ----------
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3) Çalışma zamanı ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LRWEBS_UPLOAD_DIR=/app/data/uploads

# Root olmayan kullanıcı
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Başlangıç içeriği: kalıcı disk boşsa ilk açılışta /app/data içine kopyalanır.
COPY --from=build --chown=nextjs:nodejs /app/data/cms-store.json ./seed/cms-store.json
COPY --chown=nextjs:nodejs docker-entrypoint.mjs ./docker-entrypoint.mjs

# İmajdaki /app/data boş tutulur; içerik ilk açılışta seed/ klasöründen kopyalanır.
RUN rm -rf /app/data && mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
USER nextjs

# İçerik, mesajlar, oturum anahtarı ve yüklenen dosyalar bu diskte kalıcıdır.
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "docker-entrypoint.mjs"]
