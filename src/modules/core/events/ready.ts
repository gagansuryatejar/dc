/**
 * ClientReady event handler.
 * Executed once upon successful authentication with Discord Gateway.
 */

import { ActivityType, Events, type Client } from "discord.js";
import { CORE } from "../../../config/features.js";
import type { NexusEvent } from "../../../types/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { guildRepository } from "../../../database/index.js";

const logger = createModuleLogger("event:ready");

export const readyEvent: NexusEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  module: CORE,

  async execute(client: Client<true>): Promise<void> {
    logger.info(`====================================================`);
    logger.info(`⚡ NEXUS AI is ONLINE! Authenticated as ${client.user?.tag} (${client.user?.id})`);
    logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} cached members.`);
    logger.info(`====================================================`);

    // Set dynamic, professional presence
    client.user?.setPresence({
      activities: [
        {
          name: `/nexus | Safeguarding ${client.guilds.cache.size} Communities`,
          type: ActivityType.Custom,
        },
      ],
      status: "online",
    });

    // Synchronize current guilds into database
    for (const guild of client.guilds.cache.values()) {
      try {
        await guildRepository.findOrCreate(guild.id, guild.name, guild.ownerId);
      } catch (err) {
        logger.error({ err, guildId: guild.id }, "Error syncing guild record on startup");
      }
    }

    logger.info("Initial guild synchronization complete.");
  },
};
