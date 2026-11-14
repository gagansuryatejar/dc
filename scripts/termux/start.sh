#!/data/data/com.termux/files/usr/bin/bash
# ====================================================
# NEXUS AI - Android Termux Lightweight Runner
# Designed for OPPO Reno10 5G (8GB RAM / Android 13+)
# Dual-Mode Operation: Lightweight (Default) | Advanced Voice
# ====================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"

echo "===================================================="
echo "⚡ NEXUS AI - Termux Mobile Environment Launcher"
echo "Host: OPPO Reno10 5G (Target RAM Footprint: ≤120MB)"
echo "===================================================="

# Ensure runtime directories exist
mkdir -p data logs data/backups

# Export Android deployment & power-saving configurations
export DEPLOYMENT_MODE="android"
export ANDROID_VOICE_MODE="${ANDROID_VOICE_MODE:-lightweight}"
export ANDROID_BATTERY_GUARD="true"
export NODE_ENV="production"

# Check Node.js runtime
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Run: pkg install nodejs-lts"
    exit 1
fi

echo "Node.js Runtime: $(node --version)"
echo "Deployment Mode: ${DEPLOYMENT_MODE} (Voice: ${ANDROID_VOICE_MODE})"

# Inspect battery status if termux-api is available
if command -v termux-battery-status &> /dev/null; then
    BAT_STATUS=$(termux-battery-status 2>/dev/null || true)
    if [ -n "$BAT_STATUS" ]; then
        echo "Device Battery: ${BAT_STATUS}"
    fi
fi

# Acquire Termux wake lock to prevent background CPU throttling
if command -v termux-wake-lock &> /dev/null; then
    echo "Acquiring Android CPU wake-lock..."
    termux-wake-lock
    # Clean up wake lock on process termination
    trap 'echo "Releasing wake lock..."; termux-wake-unlock 2>/dev/null || true; exit 0' INT TERM EXIT
fi

# Synchronize database schema if first run
if [ ! -f "data/nexus.db" ]; then
    echo "First run detected. Synchronizing SQLite database schema..."
    npx prisma db push
fi

# Build project if dist is missing
if [ ! -d "dist" ]; then
    echo "Compiled files not found. Building project..."
    npm run build
fi

echo ""
echo "🚀 Launching NEXUS AI Core in Android Lightweight Mode..."
echo "Press Ctrl+C to terminate cleanly."

# Auto-recovery watchdog loop
while true; do
    echo "[$(date)] Starting NEXUS AI process..." >> logs/termux.log
    node dist/index.js || true
    EXIT_CODE=$?
    echo "[$(date)] Process exited with code ${EXIT_CODE}. Restarting in 5s..." >> logs/termux.log
    echo "[WARN] Bot process exited with code ${EXIT_CODE}. Restarting in 5 seconds..."
    sleep 5
done
