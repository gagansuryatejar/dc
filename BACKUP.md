# NEXUS AI — Backup Guide

Regular, automated backups of PostgreSQL and Redis are essential for disaster
recovery. Backups run inside the container network so credentials never leave
the private network.

---

## 1. PostgreSQL Backups

### One-off backup

```bash
# From the host
docker compose exec -T postgres pg_dump -U nexus nexus_ai \
  > backups/nexus_postgres_$(date +%F_%H-%M).sql
```

### Automated daily backup (host cron)

Add to the host's crontab (`crontab -e`):

```cron
# Daily at 02:00 — backup NEXUS AI PostgreSQL
0 2 * * * cd /opt/nexus-ai && docker compose exec -T postgres pg_dump -U nexus nexus_ai | gzip > ./backups/pg_$(date +\%F).sql.gz
```

### Retention (prune old backups)

```bash
# Keep last 7 days
find ./backups -name "pg_*.sql.gz" -mtime +7 -delete
```

---

## 2. Redis Backups

Redis persists data to `/data` (volume `nexus_redis_data`). To snapshot:

```bash
docker compose exec -T redis redis-cli -a ${REDIS_PASSWORD} BGSAVE
docker cp nexus-redis:/data/dump.rdb backups/redis_$(date +%F).rdb
```

---

## 3. Volume Backups (full container state)

```bash
# Stop services, then archive volumes
docker compose stop
docker run --rm \
  -v nexus_postgres_data:/source:ro \
  -v "$(pwd)/backups:/backup" \
  alpine tar czf /backup/volumes_$(date +%F).tar.gz -C /source .
docker compose start
```

---

## 4. Restore from Backup

### PostgreSQL

```bash
# Decompress and restore
docker compose exec -T postgres psql -U nexus -d nexus_ai < backups/nexus_postgres_YYYY-MM-DD.sql
```

### After restore

```bash
docker compose restart nexus-ai
npx prisma generate
```

---

## 5. Backup Storage Recommendations

- Store backups off-host (S3-compatible object storage, or a separate VPS)
- Encrypt backup archives at rest
- Test restores quarterly
