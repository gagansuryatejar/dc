/**
 * NEXUS AI — The Next Generation AI-Powered Discord Community Operating System.
 * Main application entry point.
 */

import "dotenv/config";
import os from "node:os";
import { NexusClient } from "./bot/client.js";
import { moduleLoader } from "./handlers/moduleLoader.js";
import { coreModule } from "./modules/core/index.js";
import { engagementModule } from "./modules/engagement/index.js";
import { voiceModule } from "./modules/voice/index.js";
import { aiModule } from "./modules/ai/index.js";
import { moderationModule } from "./modules/moderation/index.js";
import { streamerModule } from "./modules/streamer/index.js";
import { analyticsModule } from "./modules/analytics/index.js";
import { logger } from "./utils/logger.js";
import { BOT_NAME, BOT_VERSION } from "./utils/constants.js";

async function bootstrap(): Promise<void> {
  // Console branding banner
  logger.info(`
====================================================
 ███╗   ██╗███████╗██╗   ██╗██╗   ██╗███████╗    █████╗ ██╗
 ████╗  ██║██╔════╝╚██╗ ██╔╝██║   ██║██╔════╝   ██╔══██╗██║
 ██╔██╗ ██║█████╗   ╚████╔╝ ██║   ██║███████╗   ███████║██║
 ██║╚██╗██║██╔══╝    ╚██╔╝  ██║   ██║╚════██║   ██╔══██║██║
 ██║ ╚████║███████╗   ██║   ╚██████╔╝███████║██╗██║  ██║██║
 ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═╝╚═╝
              ${BOT_NAME} v${BOT_VERSION}
====================================================
Host: ${os.hostname()} | OS: ${os.type()} ${os.release()} (${os.arch()})
Node.js: ${process.version} | Free RAM: ${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
====================================================`);

  const client = new NexusClient();

  // Load core, engagement, voice, AI, and moderation modules
  await moduleLoader.load(coreModule);
  await moduleLoader.load(engagementModule);
  await moduleLoader.load(voiceModule);
  await moduleLoader.load(aiModule);
  await moduleLoader.load(moderationModule);
  await moduleLoader.load(streamerModule);
  await moduleLoader.load(analyticsModule);

  // Setup process termination handlers for graceful shutdown
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
  });

  // Launch bot client
  await client.start();
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Fatal bootstrap error in NEXUS AI");
  process.exit(1);
});
