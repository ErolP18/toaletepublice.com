# syntax=docker/dockerfile:1.7
# Imagine de productie Next.js (standalone). Generata la migrarea de pe Coolify.
# Node 22.11.0 = aceeasi versiune care rula in Coolify.
FROM node:22.11.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS builder
# unelte pentru module native (ex. better-sqlite3) daca nu exista binar precompilat
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN if grep -q '"postinstall"' package.json; then npm run postinstall; fi
# Variabilele de build vin ca secret (nu raman in imagine), la fel ca in Coolify
RUN --mount=type=secret,id=buildenv,target=/app/.env.production,required=false \
    npm run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/data ./data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
