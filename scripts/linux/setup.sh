#!/bin/bash
# ==============================================================================
# ⚡ NEXUS AI — Oracle Cloud Free Tier & Linux Production Setup Script
# Works on Ubuntu 22.04 / 24.04 LTS & Oracle Linux (ARM64 Ampere or x86_64 AMD)
# ==============================================================================

set -e

echo "===================================================="
echo "⚡ Starting NEXUS AI Setup for Oracle Cloud Free Tier"
echo "===================================================="

# 1. Update OS package lists
echo "📦 Updating OS packages..."
sudo apt update -y && sudo apt upgrade -y

# 2. Install essential system dependencies (Git, Curl, Build Tools, Python)
echo "📦 Installing system build tools..."
sudo apt install -y curl git build-essential ufw

# 3. Install Node.js 20 LTS via NodeSource
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js already installed: $(node -v)"
fi

# 4. Install PM2 globally for 24/7 background process management
echo "📦 Installing PM2 globally..."
sudo npm install -g pm2

# 5. Install project dependencies
echo "📦 Installing npm dependencies..."
npm install

# 6. Initialize SQLite database via Prisma
echo "🗄️ Setting up SQLite database..."
mkdir -p data logs
npx prisma db push

# 7. Build TypeScript project
echo "🔨 Building TypeScript project..."
npm run build

# 8. Configure firewall / port opening for Web Dashboard (Port 3000)
echo "🛡️ Configuring local firewall for port 3000..."
sudo ufw allow 22/tcp || true
sudo ufw allow 3000/tcp || true

# Also configure Oracle Linux iptables rules if applicable
if command -v iptables &> /dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT || true
fi

echo "===================================================="
echo "✅ Setup Complete!"
echo "Next Steps:"
echo " 1. Configure .env with your DISCORD_TOKEN"
echo " 2. Deploy slash commands: npm run deploy:commands"
echo " 3. Start 24/7 with PM2: pm2 start ecosystem.config.cjs"
echo " 4. Save PM2 startup: pm2 save && pm2 startup"
echo "===================================================="
