# Realtime (Socket.io) server for multiplayer spelling battles.
# Build context: ./realtime  (see docker-compose.yml + .github/workflows/ghcr.yml)
#
# Stage layout:
#   deps     — FULL install (incl. devDeps) so the builder has `typescript`/`tsc`
#   builder  — compiles TypeScript -> JavaScript
#   prod-deps — production deps only (slim final image, no test/build tooling)
#   runner   — compiled dist + prod node_modules
FROM node:18-alpine AS base

# Full dependencies (devDeps included — needed to build).
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript -> JavaScript.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
COPY package.json ./
RUN npm run build

# Production dependencies only (keeps the final image small).
FROM base AS prod-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
# Healthcheck hits the HTTP /health endpoint served alongside Socket.io.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Compiled entry point.
CMD ["node", "dist/server.js"]
