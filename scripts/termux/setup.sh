#!/data/data/com.termux/files/usr/bin/bash
# ====================================================
# NEXUS AI - Automated Android Termux Setup Script
# Designed for OPPO Reno10 5G (8GB RAM / Android 13+)
# ====================================================

set -e

echo "===================================================="
echo "⚡ NEXUS AI - Android Termux Automated Setup"
echo "Target: OPPO Reno10 5G (Lightweight Mobile Profile)"
echo "===================================================="
echo ""

# 1. Update Termux packages
echo "[1/5] Updating Termux package repositories..."
pkg update -y && pkg upgrade -y

# 2. Install required packages
echo "[2/5] Installing Node.js LTS, Git, SQLite, and Termux API..."
pkg install -y nodejs-lts git sqlite termux-api

# 3. Create required runtime directories
echo "[3/5] Creating runtime directories..."
mkdir -p data logs data/backups

# 4. Install Node dependencies
echo "[4/5] Installing project dependencies..."
npm install

# 5. Database setup & Build
echo "[5/6] Generating Prisma client and synchronizing SQLite..."
npx prisma generate
npx prisma db push

echo "[6/6] Compiling TypeScript project..."
npm run build

echo ""
echo "===================================================="
echo "✅ NEXUS AI Setup Completed Successfully on Termux!"
echo "To launch in Lightweight Mobile Mode, run:"
echo "  bash scripts/termux/start.sh"
echo "===================================================="
