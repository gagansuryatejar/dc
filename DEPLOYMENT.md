# NEXUS AI — Production Deployment Guide

Production deployment on a Linux VPS or equivalent paid hosting platform
(e.g. Oracle Cloud, AWS EC2, DigitalOcean, Hetzner, Linode).

NEXUS AI runs as separate services: Discord bot, Backend API, PostgreSQL, Redis.
The bot remains online independently of the web dashboard (Phase 11).

> ⚠️ PostgreSQL (5432) and Redis (6379) are NEVER exposed publicly.
> Only the Backend API port (4000) is exposed, behind a reverse proxy + HTTPS.

---

## 1. Prerequisites

- Linux VPS (Ubuntu 22.04/24.04 LTS recommended), 2 vCPU / 4 GB RAM minimum
- Docker + Docker Compose installed
- A Discord application (https://discord.com/developers/applications) with:
  - Bot token
  - Application ID (Client ID)
  - Public key
  - Privileged Gateway Intents enabled (Presence, Server Members, Message Content)
- A domain name pointed at the VPS (for HTTPS dashboard, Phase 11)

---

## 2. Clone & Configure

```bash
# On the VPS
git clone <your-repo-url> dc-bot
cd dc-bot

# Copy environment template
cp .env.example .env
```

Edit `.env` and fill in **all required values**:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_PUBLIC_KEY=your_public_key
OWNER_ID=your_discord_user_id
GUILD_ID=your_dev_guild_id

DATABASE_URL=postgresql://nexus:nexus_password@postgres:5432/nexus_ai?schema=public
REDIS_URL=redis://:nexus_redis_password@redis:6379

NODE_ENV=production
LOG_LEVEL=info

API_PORT=4000
DASHBOARD_PORT=3000
DASHBOARD_SECRET=change_me
JWT_SECRET=change_me
ENCRYPTION_KEY=change_me_to_32_base64_chars
```

> Never commit `.env`. It is gitignored. Never paste tokens into chat or logs.

---

## 3. Deploy with Docker Compose

```bash
# Pull/build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f nexus-ai
docker compose logs -f nexus-postgres
docker compose logs -f nexus-redis
```

The compose file starts:
- `nexus-postgres` — PostgreSQL 16 (internal network only)
- `nexus-redis` — Redis 7 (internal network only)
- `nexus-ai` — Discord bot + Backend API (port 4000 exposed)

PostgreSQL and Redis are **not published to the host**, so they cannot be
reached from the public internet. Only port 4000 (Backend API) is exposed.

---

## 4. Register Discord Slash Commands

Once the bot is online, register commands:

```bash
# Register to your development guild (instant updates)
npm run deploy:commands

# Or register globally (takes up to 1 hour to propagate)
npx tsx scripts/deploy-commands.ts --global
```

Commands are registered once per deployment; re-run after adding new commands.

---

## 5. Database Migrations

Phase 1 uses `prisma db push` (schema-first). For production with existing data:

```bash
docker compose exec nexus-ai npx prisma migrate deploy
```

Or, for initial setup:
```bash
docker compose exec nexus-ai npx prisma db push
```

---

## 6. Reverse Proxy & HTTPS (Recommended)

Place Nginx, Caddy, or Cloudflare Tunnel in front of port 4000 for HTTPS:

```bash
# Example: Cloudflare Tunnel (no open ports)
cloudflared tunnel --url http://localhost:4000
```

For the Next.js dashboard (Phase 11) on port 3000, proxy it through the same
reverse proxy with authentication.

---

## 7. Process Management

Inside the container, `docker-entrypoint.sh` launches the bot and API together.
Docker's `restart: unless-stopped` provides automatic restarts.

Systemd service (if running bare-metal without Docker):

```ini
[Unit]
Description=NEXUS AI
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexus-ai
EnvironmentFile=/opt/nexus-ai/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
User=nexus

[Install]
WantedBy=multi-user.target
```

---

## 8. Verify Deployment

```bash
# Bot health
curl -sf http://localhost:4000/health && echo " OK"

# Bot logs
docker compose logs nexus-ai | tail -50

# Confirm slash commands appear in Discord
```

Expected bot log output on startup:
```
NEXUS AI v1.0
Host: <hostname> | OS: Linux ...
Database connection established successfully
NEXUS AI Gateway connected — ready on <guild_count> guild(s)
```

---

## 9. Security Checklist

- [ ] `.env` contains real secrets, not defaults
- [ ] PostgreSQL & Redis ports NOT published in `docker-compose.yml`
- [ ] `DISCORD_TOKEN`, `DISCORD_CLIENT_SECRET`, `JWT_SECRET` not committed
- [ ] Firewall (ufw) allows only 80/443 (reverse proxy) and 22 (SSH)
- [ ] Privileged Gateway Intents enabled in Discord Developer Portal
- [ ] `NODE_ENV=production`
