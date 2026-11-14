/**
 * PM2 Ecosystem Configuration for NEXUS AI.
 * Fully optimized for Unrestricted High-Performance Coder Plan (2GB RAM, 200% Dedicated vCPU, NVMe).
 */

module.exports = {
  apps: [
    {
      name: "nexus-bot",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      node_args: "--max-old-space-size=1536",
      // Unrestricted high-performance memory ceiling
      max_memory_restart: "1600M",
      restart_delay: 2000,
      max_restarts: 30,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        DEPLOYMENT_MODE: "server",
      },
      error_file: "./logs/pm2-bot-error.log",
      out_file: "./logs/pm2-bot-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
    {
      name: "nexus-dashboard",
      script: "./dist/dashboard/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      node_args: "--max-old-space-size=400",
      max_memory_restart: "450M",
      restart_delay: 2000,
      max_restarts: 30,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        DASHBOARD_PORT: 3000,
      },
      error_file: "./logs/pm2-dashboard-error.log",
      out_file: "./logs/pm2-dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
