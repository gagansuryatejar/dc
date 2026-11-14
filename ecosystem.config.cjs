/**
 * PM2 Ecosystem Configuration for NEXUS AI.
 * Tailored specifically for HP All-in-One Windows 10 Production Host (4GB RAM).
 */

module.exports = {
  apps: [
    {
      name: "nexus-bot",
      script: "./dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      node_args: "--max-old-space-size=350 --expose-gc",
      // Aggressive memory guard for 4GB RAM host (restarts cleanly if exceeding 350MB)
      max_memory_restart: "350M",
      restart_delay: 4000,
      max_restarts: 15,
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
      node_args: "--max-old-space-size=100",
      // Lightweight web dashboard process guard (keeps memory ≤ 100MB on 4GB host)
      max_memory_restart: "100M",
      restart_delay: 4000,
      max_restarts: 15,
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
