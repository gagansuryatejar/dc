/**
 * Slash command deployment script for NEXUS AI.
 * Registers application commands with Discord REST API globally or to a specific dev guild.
 *
 * Usage:
 *   npx tsx scripts/deploy-commands.ts           (deploys to GUILD_ID from .env)
 *   npx tsx scripts/deploy-commands.ts --global  (deploys globally to Discord)
 */

import "dotenv/config";
import { REST, Routes } from "discord.js";
import { config } from "../src/config/index.js";
import { coreModule } from "../src/modules/core/index.js";
import { engagementModule } from "../src/modules/engagement/index.js";
import { voiceModule } from "../src/modules/voice/index.js";
import { aiModule } from "../src/modules/ai/index.js";
import { moderationModule } from "../src/modules/moderation/index.js";
import { streamerModule } from "../src/modules/streamer/index.js";
import { analyticsModule } from "../src/modules/analytics/index.js";
import { logger } from "../src/utils/logger.js";

async function deploy(): Promise<void> {
  const isGlobal = process.argv.includes("--global");
  const token = config.discord.token;
  const clientId = config.discord.clientId;
  const guildId = config.discord.guildId;

  if (!token || !clientId) {
    logger.fatal("DISCORD_TOKEN and DISCORD_CLIENT_ID must be specified in .env");
    process.exit(1);
  }

  // Collect all commands across loaded modules
  const commands = [
    ...coreModule.commands.map((c) => c.data.toJSON()),
    ...engagementModule.commands.map((c) => c.data.toJSON()),
    ...voiceModule.commands.map((c) => c.data.toJSON()),
    ...aiModule.commands.map((c) => c.data.toJSON()),
    ...moderationModule.commands.map((c) => c.data.toJSON()),
    ...streamerModule.commands.map((c) => c.data.toJSON()),
    ...analyticsModule.commands.map((c) => c.data.toJSON()),
  ];

  logger.info(`Loaded ${commands.length} application commands for deployment.`);

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    if (isGlobal) {
      logger.info(`Deploying ${commands.length} commands globally...`);
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info("Successfully registered global slash commands.");
    } else {
      if (!guildId) {
        logger.fatal("GUILD_ID is not configured in .env. Specify GUILD_ID or pass --global.");
        process.exit(1);
      }
      logger.info(`Deploying ${commands.length} commands to guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info(`Successfully registered commands for guild ${guildId}.`);
    }
  } catch (error) {
    logger.fatal({ error }, "Failed to deploy application commands to Discord API");
    process.exit(1);
  }
}

deploy();
