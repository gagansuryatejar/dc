/**
 * Standalone Web Dashboard Server for NEXUS AI.
 * Ultra-lightweight HTTP server optimized for the HP All-in-One 4GB RAM environment.
 * Operates independently of the Discord bot process.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config/index.js";
import { DEFAULT_FEATURES } from "../config/features.js";
import { prisma } from "../database/index.js";
import { analyticsService } from "../modules/analytics/services/analytics.service.js";
import { createModuleLogger } from "../utils/logger.js";
import { BOT_NAME, BOT_VERSION } from "../utils/constants.js";

const logger = createModuleLogger("dashboard:server");

export interface DashboardServerOptions {
  port?: number;
  host?: string;
  secret?: string;
}

export class DashboardServer {
  private server: http.Server | null = null;
  private port: number;
  private host: string;
  private secret: string;

  constructor(options: DashboardServerOptions = {}) {
    this.port =
      options.port ??
      (Number(process.env.PORT) ||
        Number(process.env.DASHBOARD_PORT) ||
        config.dashboard.port ||
        3000);
    this.host = options.host ?? (process.env.DASHBOARD_HOST || "0.0.0.0");
    this.secret =
      options.secret ??
      process.env.DASHBOARD_AUTH_TOKEN ??
      process.env.DASHBOARD_SECRET ??
      config.dashboard.secret ??
      "nexus-admin-2026";
  }

  public getSecret(): string {
    return this.secret;
  }

  public getPort(): number {
    return this.port;
  }

  /**
   * Validates if a request contains a valid admin authorization token.
   */
  public isAuthorized(req: http.IncomingMessage): boolean {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      return token === this.secret;
    }

    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (reqUrl.searchParams.get("token") === this.secret) {
      return true;
    }

    const customToken = req.headers["x-nexus-auth"];
    if (typeof customToken === "string" && customToken === this.secret) {
      return true;
    }

    return false;
  }

  /**
   * Helper to parse incoming JSON request bodies safely with size limit.
   */
  private async parseJsonBody(req: http.IncomingMessage, limitBytes: number = 1048576): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = "";
      let receivedBytes = 0;

      req.on("data", (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > limitBytes) {
          req.destroy(new Error("Request payload too large (max 1MB)"));
          return;
        }
        data += chunk;
      });

      req.on("end", () => {
        if (!data.trim()) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON payload"));
        }
      });

      req.on("error", (err) => reject(err));
    });
  }

  /**
   * Sends a JSON response with CORS headers.
   */
  private sendJson(res: http.ServerResponse, statusCode: number, data: any): void {
    const payload = JSON.stringify(data);
    res.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Nexus-Auth",
    });
    res.end(payload);
  }

  /**
   * Sends error responses.
   */
  private sendError(res: http.ServerResponse, statusCode: number, message: string): void {
    this.sendJson(res, statusCode, { error: message, statusCode });
  }

  /**
   * Core request dispatcher.
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Nexus-Auth",
      });
      res.end();
      return;
    }

    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = reqUrl.pathname;
    const method = req.method || "GET";

    try {
      // ── API ROUTES ──────────────────────────────────────────

      // 1. Health check (public)
      if ((pathname === "/api/health" || pathname === "/health") && method === "GET") {
        this.sendJson(res, 200, {
          status: "ok",
          botName: BOT_NAME,
          version: BOT_VERSION,
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 1b. Admin Server Status (Protected - requires Bearer token)
      if (pathname === "/api/status" && method === "GET") {
        if (!this.isAuthorized(req)) {
          this.sendError(res, 401, "Unauthorized: Invalid or missing admin authorization token.");
          return;
        }
        this.sendJson(res, 200, {
          success: true,
          botName: BOT_NAME,
          version: BOT_VERSION,
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Global / Guild Stats Overview
      if (pathname === "/api/stats" && method === "GET") {
        const guildId = reqUrl.searchParams.get("guildId") || undefined;
        const whereClause = guildId ? { guildId } : {};

        const [guildCount, totalMembers, membersAgg, activeTickets, totalInfractions] = await Promise.all([
          prisma.guild.count(),
          prisma.guildMember.count({ where: whereClause }),
          prisma.guildMember.aggregate({
            where: whereClause,
            _sum: {
              messageCount: true,
              voiceMinutes: true,
            },
          }),
          prisma.supportTicket.count({ where: { ...whereClause, status: "open" } }),
          prisma.infraction.count({ where: { ...whereClause, active: true } }),
        ]);

        const totalMessages = membersAgg._sum.messageCount ?? 0;
        const totalVoiceMinutes = membersAgg._sum.voiceMinutes ?? 0;

        this.sendJson(res, 200, {
          guildCount,
          totalMembers,
          totalMessages,
          totalVoiceMinutes,
          totalVoiceHours: Math.round((totalVoiceMinutes / 60) * 10) / 10,
          activeTickets,
          totalInfractions,
          botVersion: BOT_VERSION,
          uptimeSeconds: Math.floor(process.uptime()),
        });
        return;
      }

      // 3. System Hardware Telemetry (HP All-in-One monitor)
      if (pathname === "/api/system" && method === "GET") {
        const telemetry = await analyticsService.getSystemTelemetry();
        this.sendJson(res, 200, telemetry);
        return;
      }

      // 4. Analytics & Retention
      if (pathname === "/api/analytics" && method === "GET") {
        const guildId = reqUrl.searchParams.get("guildId") || "";
        const days = Number(reqUrl.searchParams.get("days")) || 7;

        if (!guildId) {
          // Find first guild if not specified
          const firstGuild = await prisma.guild.findFirst();
          if (!firstGuild) {
            this.sendJson(res, 200, { message: "No active guilds found in database", history: [] });
            return;
          }
          const [summary, velocity, history] = await Promise.all([
            analyticsService.getActivitySummary(firstGuild.id),
            analyticsService.getRetentionAndVelocity(firstGuild.id, days),
            analyticsService.getHistoricalMetrics(firstGuild.id, days),
          ]);
          this.sendJson(res, 200, { guildId: firstGuild.id, summary, velocity, history });
          return;
        }

        const [summary, velocity, history] = await Promise.all([
          analyticsService.getActivitySummary(guildId),
          analyticsService.getRetentionAndVelocity(guildId, days),
          analyticsService.getHistoricalMetrics(guildId, days),
        ]);

        this.sendJson(res, 200, { guildId, summary, velocity, history });
        return;
      }

      // 5. Moderation & Audit Logs
      if (pathname === "/api/moderation" && method === "GET") {
        const guildId = reqUrl.searchParams.get("guildId") || undefined;
        const limit = Math.min(100, Number(reqUrl.searchParams.get("limit")) || 20);

        const [infractions, auditLogs] = await Promise.all([
          prisma.infraction.findMany({
            where: guildId ? { guildId } : undefined,
            orderBy: { createdAt: "desc" },
            take: limit,
          }),
          prisma.auditLog.findMany({
            where: guildId ? { guildId } : undefined,
            orderBy: { createdAt: "desc" },
            take: limit,
          }),
        ]);

        this.sendJson(res, 200, { infractions, auditLogs });
        return;
      }

      // 6. Support Tickets
      if (pathname === "/api/tickets" && method === "GET") {
        const guildId = reqUrl.searchParams.get("guildId") || undefined;
        const status = reqUrl.searchParams.get("status") || undefined;
        const limit = Math.min(100, Number(reqUrl.searchParams.get("limit")) || 30);

        const where: any = {};
        if (guildId) where.guildId = guildId;
        if (status && status !== "all") where.status = status;

        const tickets = await prisma.supportTicket.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        this.sendJson(res, 200, { tickets });
        return;
      }

      // 7. Modules List & Feature Flags
      if (pathname === "/api/modules" && method === "GET") {
        const guildId = reqUrl.searchParams.get("guildId") || "";

        // Query database module overrides
        const overrides = guildId
          ? await prisma.moduleConfig.findMany({ where: { guildId } })
          : [];

        const overrideMap = new Map(overrides.map((o) => [o.module, o.enabled]));

        const modules = DEFAULT_FEATURES.map((feat) => ({
          name: feat.name,
          label: feat.label,
          description: feat.description,
          enabled: overrideMap.has(feat.name) ? overrideMap.get(feat.name)! : feat.enabledByDefault,
          isDefault: feat.enabledByDefault,
        }));

        this.sendJson(res, 200, { modules, guildId });
        return;
      }

      // 8. Module Toggle (Protected - Admin Auth required)
      if (pathname === "/api/modules/toggle" && method === "POST") {
        if (!this.isAuthorized(req)) {
          this.sendError(res, 401, "Unauthorized: Invalid or missing admin authorization token.");
          return;
        }

        const body = await this.parseJsonBody(req);
        const { guildId, module, enabled } = body;

        if (!guildId || typeof module !== "string" || typeof enabled !== "boolean") {
          this.sendError(res, 400, "Bad Request: guildId, module, and enabled (boolean) are required.");
          return;
        }

        const updated = await prisma.moduleConfig.upsert({
          where: {
            guildId_module: {
              guildId,
              module,
            },
          },
          create: {
            guildId,
            module,
            enabled,
          },
          update: {
            enabled,
          },
        });

        this.sendJson(res, 200, { success: true, moduleConfig: updated });
        return;
      }

      // 9. Admin Token Verification
      if (pathname === "/api/auth/login" && method === "POST") {
        const body = await this.parseJsonBody(req);
        const token = body?.token;

        if (token && token === this.secret) {
          this.sendJson(res, 200, { success: true, authorized: true, message: "Authentication successful" });
        } else {
          this.sendJson(res, 401, { success: false, authorized: false, message: "Invalid authorization token" });
        }
        return;
      }

      // ── STATIC FRONTEND SERVING ─────────────────────────────
      if (method === "GET") {
        // Resolve frontend public directory (check dist first, fallback to src)
        const candidateDist = path.join(process.cwd(), "dist/dashboard/public");
        const candidateSrc = path.join(process.cwd(), "src/dashboard/public");
        const publicDir = fs.existsSync(candidateDist) ? candidateDist : candidateSrc;

        const targetFile = pathname === "/" ? "index.html" : pathname;
        let filePath = path.join(publicDir, targetFile);

        // Security check against directory traversal
        const normalized = path.normalize(filePath);
        if (!normalized.startsWith(publicDir)) {
          this.sendError(res, 403, "Forbidden");
          return;
        }

        if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
          const ext = path.extname(normalized).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon",
          };

          const contentType = mimeTypes[ext] || "text/plain";
          const content = fs.readFileSync(normalized);
          res.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": content.length,
          });
          res.end(content);
          return;
        } else {
          // Fallback to index.html for SPA routing if available
          const indexPath = path.join(publicDir, "index.html");
          if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath);
            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Length": content.length,
            });
            res.end(content);
            return;
          }
        }
      }

      // Fallback 404
      this.sendError(res, 404, `Route not found: ${method} ${pathname}`);
    } catch (err: any) {
      logger.error({ err, path: pathname }, "Error handling dashboard request");
      this.sendError(res, 500, err?.message || "Internal server error");
    }
  }

  /**
   * Starts the dashboard HTTP server.
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, this.host, () => {
        logger.info(`NEXUS AI Dashboard online at http://${this.host}:${this.port}`);
        logger.info(`Admin Auth Token configured (pass Authorization: Bearer <token>)`);
        resolve();
      });
    });
  }

  /**
   * Shuts down the dashboard HTTP server gracefully.
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info("Dashboard HTTP server stopped cleanly.");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// ── Standalone CLI execution entry point ────────────────
if (process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"))) {
  const dashboard = new DashboardServer();
  dashboard.start().catch((err) => {
    logger.fatal({ err }, "Failed to start standalone dashboard server");
    process.exit(1);
  });
}
