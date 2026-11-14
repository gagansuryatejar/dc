/**
 * ClientReady event handler.
 * Executed once upon successful authentication with Discord Gateway.
 */
import { ActivityType, Events } from "discord.js";
import { CORE } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { guildRepository } from "../../../database/index.js";
const logger = createModuleLogger("event:ready");
export const readyEvent = {
    name: Events.ClientReady,
    once: true,
    module: CORE,
    async execute(client) {
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
            }
            catch (err) {
                logger.error({ err, guildId: guild.id }, "Error syncing guild record on startup");
            }
        }
        logger.info("Initial guild synchronization complete.");
    },
};
//# sourceMappingURL=ready.js.map