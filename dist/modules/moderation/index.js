/**
 * Moderation & Interactive Support Module for NEXUS AI.
 * Exports module definition, slash commands, and event handlers.
 */
import { MODERATION } from "../../config/features.js";
import { createModuleLogger } from "../../utils/logger.js";
import { warnCommand, timeoutCommand, untimeoutCommand, kickCommand, banCommand, unbanCommand, modCommand, } from "./commands/moderation.js";
import { ticketCommand } from "./commands/ticket.js";
import { automodMessageEvent } from "./events/automod-message.js";
import { automodJoinEvent } from "./events/automod-join.js";
import { ticketButtonsEvent } from "./events/ticket-buttons.js";
const logger = createModuleLogger("module:moderation");
export class ModerationModule {
    name = MODERATION;
    version = "1.0.0";
    description = "Automated threat detection, anti-spam, anti-raid, infraction management, and support tickets";
    commands = [
        warnCommand,
        timeoutCommand,
        untimeoutCommand,
        kickCommand,
        banCommand,
        unbanCommand,
        modCommand,
        ticketCommand,
    ];
    events = [automodMessageEvent, automodJoinEvent, ticketButtonsEvent];
    async onLoad() {
        logger.info("Initializing Moderation Subsystem & Automod Engine...");
    }
    async onUnload() {
        logger.info("Moderation Subsystem unloaded.");
    }
    async onEnable() {
        logger.info("Moderation Subsystem enabled.");
    }
    async onDisable() {
        logger.info("Moderation Subsystem disabled.");
    }
    async healthCheck() {
        return {
            status: "healthy",
            message: "Automod and infraction subsystems fully operational",
            lastCheck: new Date(),
        };
    }
}
export const moderationModule = new ModerationModule();
//# sourceMappingURL=index.js.map