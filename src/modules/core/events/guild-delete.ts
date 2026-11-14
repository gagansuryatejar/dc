/**
 * GuildDelete event handler.
 * Executed when the bot is removed from a guild or a guild is deleted.
 */

import { Events, type Guild } from "discord.js";
import { CORE } from "../../../config/features.js";
import type { NexusEvent } from "../../../types/index.js";
import { createModuleLogger } from "../../../utils/logger.js";

const logger = createModuleLogger("event:guildDelete");

export const guildDeleteEvent: NexusEvent<Events.GuildDelete> = {
  name: Events.GuildDelete,
  once: false,
  module: CORE,

  async execute(guild: Guild): Promise<void> {
    logger.warn(`Removed from guild: ${guild.name} (${guild.id})`);
  },
};
