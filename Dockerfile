# =================================================================
# NEXUS AI — Multi-Stage Production Dockerfile
# Target: Linux VPS / paid cloud hosting (Ubuntu/Debian-based)
# Services: Discord bot + Backend API (PostgreSQL & Redis via compose)
# =================================================================

# ── Build Stage ───────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build tooling for native modules (e.g. @discordjs/voice, opusscript)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Generate Prisma client (PostgreSQL provider)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source, scripts, and config
COPY tsconfig.json ./
COPY src ./src/
COPY services ./services/
COPY scripts ./scripts/

# Compile TypeScript
RUN npm run build

# ── Runtime Stage ─────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Runtime dependencies: curl for healthchecks, openssl for PostgreSQL client libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r nexus && useradd -r -g nexus -s /sbin/nologin nexus

ENV NODE_ENV=production
ENV DEPLOYMENT_MODE=server
ENV PORT=4000

# Production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Prisma client + compiled output
COPY prisma ./prisma/
RUN npx prisma generate
COPY --from=builder /app/dist ./dist

# Non-executable data directories (mounted volumes in compose)
RUN mkdir -p /app/logs /app/data /app/backups && \
    chown -R nexus:nexus /app

USER nexus

# Expose Backend API port (Discord bot connects outbound; no inbound ports required)
EXPOSE 4000

# Healthcheck — Backend API
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:4000/health || exit 1

# Entrypoint: run bot + API via the entrypoint script
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

CMD ["./scripts/docker-entrypoint.sh"]
