# NEXUS AI — Disaster Recovery Guide

Covers total VPS loss, database corruption, and credential loss. Follow in order.

---

## Scenario A — VPS Lost, Backups Available

1. Provision a new Linux VPS (same or larger spec).
2. Install Docker + Docker Compose.
3. Clone the repository: `git clone <repo> dc-bot && cd dc-bot`
4. Restore `.env` from your secret manager / encrypted backup.
5. Restore PostgreSQL:
   ```bash
   docker compose up -d postgres redis
   docker compose exec -T postgres psql -U nexus -d nexus_ai < backups/pg_latest.sql
   ```
6. Start the bot:
   ```bash
   docker compose up -d nexus-ai
   ```
7. Re-register slash commands:
   ```bash
   npm run deploy:commands
   ```

---

## Scenario B — Database Corruption (Bot Running, Data Bad)

1. Stop the bot to prevent further writes:
   ```bash
   docker compose stop nexus-ai
   ```
2. Restore PostgreSQL from the last known-good backup (see BACKUP.md §4).
3. Restart:
   ```bash
   docker compose start nexus-ai
   ```

---

## Scenario C — Lost Discord Token / Credentials

1. Revoke the compromised token in the Discord Developer Portal immediately.
2. Regenerate the bot token.
3. Update `DISCORD_TOKEN` in `.env` (and secret manager).
4. Restart the bot:
   ```bash
   docker compose restart nexus-ai
   ```

---

## Scenario D — Forgotten Dashboard / JWT Secret

1. Generate a new strong secret (e.g. `openssl rand -hex 32`).
2. Update `JWT_SECRET` and `ENCRYPTION_KEY` in `.env`.
3. All existing dashboard sessions are invalidated (users must re-login).
4. Restart:
   ```bash
   docker compose restart nexus-ai
   ```

---

## Verification After Recovery

```bash
# All containers healthy
docker compose ps

# API responds
curl -sf http://localhost:4000/health

# Bot logged into Discord
docker compose logs nexus-ai | grep -i "ready\|gateway"

# Slash commands present in Discord server
```

If the bot fails to reconnect, check:
- `DISCORD_TOKEN` is correct and not revoked
- Privileged intents are enabled in the Discord Developer Portal
- Database is reachable (`DATABASE_URL`, PostgreSQL healthy)
