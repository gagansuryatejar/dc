/**
 * GuildCreate event handler.
 * Executed when the bot joins a new server or when a guild becomes available.
 */

import { Events, type Guild } from "discord.js";
import { CORE } from "../../../config/features.js";
import type { NexusEvent } from "../../../types/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { guildRepository } from "../../../database/index.js";
import { auditService, AuditAction } from "../../../security/audit.js";

const logger = createModuleLogger("event:guildCreate");

export const guildCreateEvent: NexusEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,
  once: false,
  module: CORE,

  async execute(guild: Guild): Promise<void> {
    logger.info(`Joined new guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members`);

    try {
      await guildRepository.findOrCreate(guild.id, guild.name, guild.ownerId);
      await auditService.log(guild.id, AuditAction.BOT_STARTUP, {
        details: { message: "Bot integrated into guild", memberCount: guild.memberCount },
        severity: "info",
      });
    } catch (err) {
      logger.error({ err, guildId: guild.id }, "Failed to register newly joined guild in database");
    }
  },
};
