/**
 * NEXUS AI — Backend API Service (Fastify)
 * Standalone REST API that runs independently of the Discord bot.
 * Provides health checks, bot status, and dashboard data endpoints.
 *
 * Phase 1: Minimal health endpoint. Expanded in later phases.
 */

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import { config } from "../../../src/config/index.js";
import { logger } from "../../../src/utils/logger.js";
import { databaseHealth } from "../../../src/database/client.js";

const moduleLog = logger.child({ service: "backend-api" });

const fastify = Fastify({
  logger: config.isProd ? undefined : { transport: { target: "pino-pretty", options: { colorize: true } } },
});

// Security middleware
await fastify.register(fastifyHelmet);
await fastify.register(fastifyCors, {
  origin: config.isProd ? false : true, // restrict in production
});

// ── Health check ─────────────────────────────────────────────────────
fastify.get("/health", async () => {
  const db = await databaseHealth();
  return {
    status: "ok",
    service: "nexus-ai-backend",
    version: "1.0.0",
    environment: config.nodeEnv,
    database: db.healthy ? "healthy" : "unhealthy",
    databaseLatencyMs: db.latencyMs,
    timestamp: new Date().toISOString(),
  };
});

// ── Bot status (public summary) ──────────────────────────────────────
fastify.get("/api/status", async () => {
  return {
    service: "nexus-ai",
    version: "1.0.0",
    modules: [], // populated when bot registers modules (later phases)
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
});

const start = async () => {
  try {
    await fastify.listen({
      port: config.api.port,
      host: config.api.host,
    });
    moduleLog.info(
      `Backend API listening on ${config.api.host}:${config.api.port}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify };
