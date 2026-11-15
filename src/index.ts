/**
 * NEXUS AI — Main Application Entry Point
 * Phase 1: Core bot, database, security, and command framework.
 *
 * Boot sequence:
 *   1. Load environment config (Zod-validated)
 *   2. Initialise structured logger
 *   3. Create NexusClient (discord.js)
 *   4. Load the Core module (/nexus, /help, /admin)
 *   5. Start the Discord gateway connection
 *   6. Handle graceful shutdown on SIGINT/SIGTERM
 */

import "dotenv/config";
import os from "node:os";
import { NexusClient } from "./bot/client.js";
import { moduleLoader } from "./handlers/moduleLoader.js";
import coreModule from "./modules/core/index.js";
import { engagementModule } from "./modules/engagement/index.js";
import { voiceModule } from "./modules/voice/index.js";
import { logger } from "./utils/logger.js";
import { BOT_NAME, BOT_VERSION, BOT_TAGLINE } from "./utils/constants.js";
import { config } from "./config/index.js";

async function bootstrap(): Promise<void> {
  // ── Console branding banner ──────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log(`
====================================================
 ███╗   ██╗███████╗██╗   ██╗██╗   ██╗███████╗    █████╗ ██╗
 ████╗  ██║██╔════╝╚██╗ ██╔╝██║   ██║██╔════╝   ██╔══██╗██║
 ██╔██╗ ██║█████╗   ╚████╔╝ ██║   ██║███████╗   ███████║██║
 ██║╚██╗██║██╔══╝    ╚██╔╝  ██║   ██║╚════██║   ██╔══██║██║
 ██║ ╚████║███████╗   ██║   ╚████╔╝██║███████║██╗██║  ██║██║
 ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚═════╝ ╚═════╝╚═╝  ╚═╝╚═╝
             ${BOT_NAME} v${BOT_VERSION}
        ${BOT_TAGLINE}
====================================================
Host: ${os.hostname()} | OS: ${os.type()} ${os.release()} (${os.arch()})
Node.js: ${process.version} | Env: ${config.nodeEnv}
Free RAM: ${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
====================================================`);

  const client = new NexusClient();

  // ── Load modules ─────────────────────────────────────────────────
  await moduleLoader.load(coreModule);
  await moduleLoader.load(engagementModule);
  await moduleLoader.load(voiceModule);
  logger.info(`Loaded ${moduleLoader.size} module(s): ${moduleLoader.list().join(", ")}`);

  // ── Process termination handlers (graceful shutdown) ─────────────
  const handleExit = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating controlled shutdown...`);
    try {
      await client.shutdown();
      logger.info("Shutdown completed cleanly. Process exiting.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during process shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => handleExit("SIGINT"));
  process.on("SIGTERM", () => handleExit("SIGTERM"));

  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ reason }, "Unhandled promise rejection captured");
  });

  process.on("uncaughtException", (error: Error) => {
    logger.fatal({ error }, "Uncaught exception captured in root runtime");
    process.exit(1);
  });

  // ── Launch the bot ───────────────────────────────────────────────
  await client.start();
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Fatal bootstrap error in NEXUS AI");
  process.exit(1);
});
