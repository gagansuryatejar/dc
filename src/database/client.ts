/**
 * NEXUS AI — Database Client (PostgreSQL + Prisma)
 * Singleton PrismaClient with connection event logging and graceful disconnect.
 */

import { PrismaClient } from "@prisma/client";
import { createModuleLogger } from "../utils/logger.js";
import { config } from "../config/index.js";

const logger = createModuleLogger("database");

let prisma: PrismaClient;

/**
 * Returns the singleton PrismaClient instance, creating it on first use.
 * In development, reuses the global instance to avoid hot-reload exhaustion.
 */
function getPrismaClient(): PrismaClient {
  if (prisma) return prisma;

  const client = new PrismaClient({
    log:
      config.isDev || config.isTest
        ? [
            { level: "query", emit: "event" },
            { level: "error", emit: "event" },
            { level: "warn", emit: "event" },
          ]
        : [{ level: "error", emit: "event" }, { level: "warn", emit: "event" }],
  });

  client.$on("error", (e) => {
    logger.error({ error: e }, "Prisma client error");
  });

  client.$on("warn", (e) => {
    logger.warn({ warning: e }, "Prisma client warning");
  });

  if (config.isDev) {
    client.$on("query", (e) => {
      logger.debug({ query: e.query, params: e.params, duration: e.duration }, "DB query");
    });
  }

  prisma = client;
  return prisma;
}

// Instantiate and export the singleton
prisma = getPrismaClient();

export { prisma };

/**
 * Connects to PostgreSQL and verifies the connection is alive.
 * Called during application startup.
 */
export async function connectDatabase(): Promise<void> {
  try {
    logger.info("Connecting to PostgreSQL database...");
    await prisma.$connect();
    logger.info("Database connection established successfully");
  } catch (error) {
    logger.fatal({ error }, "Failed to connect to database");
    throw error;
  }
}

/**
 * Gracefully disconnects from the database.
 * Called during application shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    logger.info("Disconnecting from database...");
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error({ error }, "Error disconnecting from database");
    throw error;
  }
}

/**
 * Returns a health check result for the database.
 */
export async function databaseHealth(): Promise<{ healthy: boolean; latencyMs?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch {
    return { healthy: false };
  }
}
