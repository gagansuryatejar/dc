# ⚡ Deploying NEXUS AI on Oracle Cloud Free Tier

This step-by-step guide will walk you through hosting **NEXUS AI** 24/7 for **100% FREE** on **Oracle Cloud Infrastructure (OCI) Always Free Tier**.

---

## 🌟 Why Oracle Cloud Free Tier?

- **Cost**: Completely **FREE forever** ($0/month).
- **Specs**: Up to **4 Ampere A1 (ARM64) OCPUs and 24 GB of RAM** (or AMD 1GB Micro).
- **Network**: Free static public IPv4, 10 TB/month free outbound traffic.
- **Uptime**: Enterprise-grade 99.99% cloud uptime (keeps your bot and dashboard online 24/7 without needing your home PC on).

---

## 🛠️ Step 1: Create an Always Free Compute Instance

1. Sign up / Log in to [Oracle Cloud Console](https://cloud.oracle.com/).
2. On the Dashboard, click **"Create a VM instance"**.
3. Configure the instance:
   - **Name**: `nexus-bot-server`
   - **Image**: Click *Edit* ➔ Select **Canonical Ubuntu 22.04 LTS** or **24.04 LTS** (or Oracle Linux 9).
   - **Shape**:
     - *Option A (Best)*: **Ampere A1 (ARM64)** ➔ Select **1 to 2 OCPUs** and **4 to 12 GB RAM** (Always Free Eligible).
     - *Option B*: **VM.Standard.E2.1.Micro (AMD x86_64)** ➔ 1 OCPU, 1 GB RAM (Always Free Eligible).
   - **Networking**: Select your default VCN & public subnet. Ensure **"Assign a public IPv4 address"** is checked.
   - **SSH Keys**: Download both the **Private Key** (`.key`) and **Public Key** to your computer.
4. Click **Create** and wait ~60 seconds for the instance state to show **RUNNING**.
5. Copy your **Public IP Address** (e.g. `129.153.xx.xx`).

---

## 🔐 Step 2: Open Ingress Ports (For Web Dashboard - Port 3000)

By default, Oracle Cloud blocks all ports except SSH (22). To access the Web Dashboard:

1. In the Oracle Console, click on your instance's **Subnet** name.
2. Under **Security Lists**, click **Default Security List for...**.
3. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `3000`
   - **Description**: `NEXUS AI Web Dashboard`
4. Click **Add Ingress Rules**.

---

## 💻 Step 3: Connect via SSH

On your Windows computer, open PowerShell or Terminal and run:

```bash
ssh -i /path/to/your-ssh-private-key.key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

*(If using Oracle Linux instead of Ubuntu, use `opc@<YOUR_ORACLE_PUBLIC_IP>`)*

---

## 🚀 Step 4: Transfer Project Files or Clone

### Option A: Upload from your PC (via SCP)
On your Windows machine, run:
```powershell
scp -i /path/to/your-key.key -r C:\Users\RG_Ga\OneDrive\Desktop\dc-bot ubuntu@<YOUR_ORACLE_PUBLIC_IP>:~/dc-bot
```

### Option B: Clone via Git
On your Oracle Cloud VM:
```bash
git clone <YOUR_GITHUB_OR_GIT_REPO_URL> dc-bot
cd dc-bot
```

---

## ⚡ Step 5: Automated One-Command Setup

Inside the `dc-bot` directory on your Oracle VM, run:

```bash
chmod +x scripts/linux/setup.sh scripts/linux/start.sh
./scripts/linux/setup.sh
```

This script will automatically:
1. Update system packages.
2. Install Node.js 20 LTS & build tools.
3. Install PM2 process manager globally.
4. Install all npm dependencies.
5. Setup the SQLite database via Prisma (`prisma db push`).
6. Compile the TypeScript code (`npm run build`).
7. Open local firewall rules for port 3000.

---

## 🔑 Step 6: Configure `.env` & Deploy Slash Commands

1. Open `.env` on the server:
   ```bash
   nano .env
   ```
2. Ensure your `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `GUILD_ID` are set.
3. Deploy all 32 slash commands to your Discord server:
   ```bash
   npm run deploy:commands
   ```

---

## 🎯 Step 7: Launch 24/7 with PM2

Start the Bot and Web Dashboard:
```bash
./scripts/linux/start.sh
```

To make sure NEXUS AI automatically starts whenever the Oracle VM reboots:
```bash
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## 📊 Useful Linux & PM2 Commands

| Action | Command |
|---|---|
| View Bot & Dashboard status | `pm2 status` |
| View live logs | `pm2 logs nexus-bot` |
| View dashboard logs | `pm2 logs nexus-dashboard` |
| Restart all processes | `pm2 restart all` |
| Stop all processes | `pm2 stop all` |

---

## 🌐 Accessing Your Web Dashboard

Open your web browser and navigate to:
```
http://<YOUR_ORACLE_PUBLIC_IP>:3000
```
Login using your admin secret or Discord credentials!
