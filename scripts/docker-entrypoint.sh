#!/usr/bin/env bash
# =================================================================
# NEXUS AI — Docker Entrypoint
# Runs the Discord bot service and Backend API service together.
# =================================================================
set -euo pipefail

# Ensure Prisma client is generated against the live DATABASE_URL
if [ -n "${DATABASE_URL:-}" ]; then
  npx prisma generate >/dev/null 2>&1 || true
fi

LOG_PREFIX="[nexus-entrypoint]"

# Start Backend API in background (separate service process)
if [ "${START_API:-true}" = "true" ]; then
  echo "$LOG_PREFIX Starting Backend API service on port ${API_PORT:-4000}..."
  node dist/services/backend-api/src/index.js &
  API_PID=$!
  echo "$LOG_PREFIX Backend API started (PID $API_PID)"
fi

# Start Discord bot (foreground, receives SIGTERM for graceful shutdown)
echo "$LOG_PREFIX Starting NEXUS AI Discord bot..."
node dist/src/index.js &
BOT_PID=$!
echo "$LOG_PREFIX Discord bot started (PID $BOT_PID)"

# Graceful shutdown on SIGTERM/SIGINT
shutdown() {
  echo "$LOG_PREFIX Shutdown signal received. Stopping services..."
  kill -TERM "$BOT_PID" 2>/dev/null || true
  kill -TERM "$API_PID" 2>/dev/null || true
  wait "$BOT_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  echo "$LOG_PREFIX All services stopped."
  exit 0
}
trap shutdown SIGTERM SIGINT

# Wait for either process to exit
wait -n

# If one exits, shut down the other
shutdown
