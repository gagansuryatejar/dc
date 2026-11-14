/**
 * Streamer & Content Creator Module definition for NEXUS AI.
 */
import { STREAMER } from "../../config/features.js";
import { createModuleLogger } from "../../utils/logger.js";
import { streamerCommand } from "./commands/streamer.js";
import { watchPartyCommand } from "./commands/watchparty.js";
import { streamPresenceEvent } from "./events/presence-update.js";
import { watchPartyButtonsEvent } from "./events/watchparty-buttons.js";
const logger = createModuleLogger("module:streamer");
export class StreamerModule {
    name = STREAMER;
    version = "1.0.0";
    description = "Content creator profiles, Discord Go Live tracking, streamer protection, watch parties, and creator lounges";
    commands = [streamerCommand, watchPartyCommand];
    events = [streamPresenceEvent, watchPartyButtonsEvent];
    async onLoad() {
        logger.info("Initializing Streamer & Creator Subsystem...");
    }
    async onUnload() {
        logger.info("Streamer Subsystem unloaded.");
    }
    async onEnable() {
        logger.info("Streamer Subsystem enabled.");
    }
    async onDisable() {
        logger.info("Streamer Subsystem disabled.");
    }
    async healthCheck() {
        return {
            status: "healthy",
            message: "Streamer mode and watch party engine operational",
            lastCheck: new Date(),
        };
    }
}
export const streamerModule = new StreamerModule();
//# sourceMappingURL=index.js.map