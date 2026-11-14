#!/bin/sh
set -e

echo "===================================================="
echo "⚡ Starting NEXUS AI Container"
echo "===================================================="

# Initialize SQLite database schema
mkdir -p data logs
npx prisma db push --skip-generate

# Start both Bot and Dashboard concurrently
echo "Starting NEXUS AI Bot & Web Dashboard..."
node dist/dashboard/server.js &
node dist/index.js
