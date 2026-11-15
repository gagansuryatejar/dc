/**
 * NEXUS AI — Slash Command Deployment Script
 * Registers /nexus, /help, /admin commands with Discord.
 *
 * Usage:
 *   npx tsx scripts/deploy-commands.ts        # Register to dev guild (instant)
 *   npx tsx scripts/deploy-commands.ts --global  # Register globally (up to 1 hour)
 */

import { config } from "../src/config/index.js";
import { logger } from "../src/utils/logger.js";
import coreModule from "../src/modules/core/index.js";
import { REST, Routes } from "discord.js";

const isGlobal = process.argv.includes("--global");

async function deploy() {
  if (!config.discord.token) {
    logger.fatal("DISCORD_TOKEN is not set in .env");
    process.exit(1);
  }
  if (!config.discord.clientId) {
    logger.fatal("DISCORD_CLIENT_ID is not set in .env");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  // Build command payloads from loaded modules
  const commands = coreModule.commands.map(
    (cmd: { name: string; description: string; options?: unknown[] }) => ({
      name: cmd.name,
      description: cmd.description,
      options: cmd.options ?? [],
    }),
  );

  try {
    if (isGlobal) {
      await rest.put(Routes.applicationCommands(config.discord.clientId), {
        body: commands,
      });
      logger.info(`Deployed ${commands.length} command(s) globally.`);
    } else {
      if (!config.discord.guildId) {
        logger.fatal("GUILD_ID is not set. Use --global or set GUILD_ID in .env.");
        process.exit(1);
      }
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      logger.info(
        `Deployed ${commands.length} command(s) to dev guild ${config.discord.guildId}.`,
      );
    }
  } catch (err) {
    logger.error({ err }, "Failed to deploy slash commands");
    process.exit(1);
  }
}

deploy();
