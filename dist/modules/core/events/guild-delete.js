/**
 * GuildDelete event handler.
 * Executed when the bot is removed from a guild or a guild is deleted.
 */
import { Events } from "discord.js";
import { CORE } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("event:guildDelete");
export const guildDeleteEvent = {
    name: Events.GuildDelete,
    once: false,
    module: CORE,
    async execute(guild) {
        logger.warn(`Removed from guild: ${guild.name} (${guild.id})`);
    },
};
//# sourceMappingURL=guild-delete.js.map