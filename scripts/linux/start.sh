#!/bin/bash
# ==============================================================================
# ⚡ NEXUS AI — Start / Stop / Restart Manager for Linux & Oracle Cloud
# ==============================================================================

ACTION=${1:-start}

case "$ACTION" in
    start)
        echo "🚀 Starting NEXUS AI Bot & Web Dashboard..."
        pm2 start ecosystem.config.cjs
        pm2 save
        echo "✅ NEXUS AI is now running in the background!"
        pm2 status
        ;;
    stop)
        echo "🛑 Stopping NEXUS AI..."
        pm2 stop ecosystem.config.cjs
        ;;
    restart)
        echo "🔄 Restarting NEXUS AI..."
        pm2 restart ecosystem.config.cjs
        ;;
    status)
        pm2 status
        ;;
    logs)
        pm2 logs nexus-bot
        ;;
    *)
        echo "Usage: ./scripts/linux/start.sh [start|stop|restart|status|logs]"
        exit 1
        ;;
esac
