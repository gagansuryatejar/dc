# NEXUS AI — Windows 10 Host Deployment Guide
### Production Deployment for HP All-in-One (4GB RAM)

This guide details how to run NEXUS AI 24/7 as a resilient background service on your HP All-in-One running Windows 10 with 4GB RAM.

---

## 1. System Requirements & Optimization
- **Operating System**: Windows 10 (64-bit or 32-bit)
- **Node.js**: Node.js 20 LTS or later
- **RAM Budget**: Process configured to consume ≤ 350 MB RAM
- **AI Processing**: Cloud AI APIs (Google Gemini, OpenAI) — **Do NOT run local Ollama models on this machine** to prevent out-of-memory lockups.
- **Database**: Local SQLite with Write-Ahead Logging (WAL mode) — zero background database server overhead.

---

## 2. Initial Setup

### Step 1: Install Node.js LTS
Download and install Node.js 20+ LTS from [nodejs.org](https://nodejs.org/). Verify:
```cmd
node -v
npm -v
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```
Fill in your credentials:
- `DISCORD_TOKEN`: Your Discord Bot Token
- `DISCORD_CLIENT_ID`: Your Application ID
- `GUILD_ID`: Your Discord Server ID
- `GEMINI_API_KEY`: Your Google AI Studio API key
- `DEPLOYMENT_MODE=server`
- `LOG_LEVEL=info`

### Step 3: Install Dependencies & Initialize Database
```cmd
npm install
npm run db:generate
npm run db:push
```

### Step 4: Build TypeScript
```cmd
npm run build
```

### Step 5: Register Slash Commands
```cmd
npx tsx scripts/deploy-commands.ts
```

---

## 3. Running as a 24/7 Background Service

### Option A: Using PM2 (Recommended)
PM2 ensures automatic startup, background execution, log rotation, and memory management.

1. Install PM2 globally:
```cmd
npm install -g pm2
npm install -g pm2-windows-startup
```

2. Register PM2 as a Windows startup service:
```cmd
pm2-startup install
```

3. Launch NEXUS AI via the ecosystem file:
```cmd
pm2 start ecosystem.config.cjs
```

4. Save current process list so it restarts automatically on Windows boot:
```cmd
pm2 save
```

5. Useful PM2 commands:
- `pm2 status` — View memory and CPU usage
- `pm2 logs nexus-bot` — View real-time logs
- `pm2 restart nexus-bot` — Restart the bot
- `pm2 stop nexus-bot` — Stop the bot

---

### Option B: Using the Windows Batch Runner
If you prefer not to install PM2, use the built-in watchdog script:
```cmd
scripts\windows\start-bot.bat
```
This script launches the bot in a persistent loop, logging crashes to `logs\runner.log` and automatically restarting the process after 5 seconds.

---

## 4. Automated Database Backups

A PowerShell backup script is included at `scripts/windows/backup-db.ps1`.

### Set up Daily Scheduled Task in Windows Task Scheduler:
1. Open **Task Scheduler** (`taskschd.msc`).
2. Click **Create Basic Task**.
3. Name: `NEXUS-AI-Backup`.
4. Trigger: **Daily** (e.g. at 03:00 AM).
5. Action: **Start a program**.
6. Program/script: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\Users\RG_Ga\OneDrive\Desktop\dc-bot\scripts\windows\backup-db.ps1"`
8. Finish.

The script creates an atomic copy of `nexus.db` inside `data/backups/` and automatically purges backups older than 7 days, keeping the latest 5 copies.

---

## 5. Security & Isolation
- **No Open Ports**: The bot operates via outbound HTTPS / WebSocket connections only. No firewall ports need to be forwarded for the bot process.
- **Token Protection**: Keep `.env` strictly protected. Never commit `.env` to version control.
- **Resource Monitoring**: The bot runs an internal resource monitor that alerts when process RSS exceeds 400 MB and triggers garbage collection to keep the HP host responsive.
