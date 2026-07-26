# Realtime (Socket.io) server for multiplayer spelling battles.
# Build context: ./realtime  (see docker-compose.yml + .github/workflows/ghcr.yml)
# Multi-stage build mirroring the app Dockerfile pattern.
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# Use ci when a lockfile exists; fall back to install for first build.
RUN npm ci --omit=dev || npm install --omit=dev

# Build TypeScript -> JavaScript
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
COPY package.json ./
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
# Healthcheck hits the HTTP /health endpoint served alongside Socket.io.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Compiled entry point
CMD ["node", "dist/server.js"]
