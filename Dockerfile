# ====================================================
# ⚡ NEXUS AI — Production Dockerfile
# Works seamlessly on Hugging Face Spaces, Render, Koyeb & VPS
# ====================================================

FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build tools for native compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY scripts ./scripts/
COPY src ./src/
RUN npx prisma generate
RUN npm run build

# Runtime Stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DEPLOYMENT_MODE=server
ENV PORT=3000

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# Startup entrypoint
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 3000 7860

CMD ["./scripts/docker-entrypoint.sh"]
