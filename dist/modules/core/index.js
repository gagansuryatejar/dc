/**
 * Core module definition for NEXUS AI.
 * Always loaded, foundational subsystem for all bot operations.
 */
import { CORE } from "../../config/features.js";
import { nexusCommand } from "./commands/nexus.js";
import { helpCommand } from "./commands/help.js";
import { adminCommand } from "./commands/admin.js";
import { readyEvent } from "./events/ready.js";
import { guildCreateEvent } from "./events/guild-create.js";
import { guildDeleteEvent } from "./events/guild-delete.js";
import { interactionCreateEvent } from "./events/interaction-create.js";
import { createModuleLogger } from "../../utils/logger.js";
const logger = createModuleLogger("module:core");
export class CoreModule {
    name = CORE;
    description = "Core bot lifecycle, diagnostics, permissions, and server administration";
    version = "1.0.0";
    commands = [nexusCommand, helpCommand, adminCommand];
    events = [readyEvent, guildCreateEvent, guildDeleteEvent, interactionCreateEvent];
    async onLoad() {
        logger.info("Initializing Core Subsystem...");
    }
    async onUnload() {
        logger.info("Core Subsystem unloaded.");
    }
    async onEnable() {
        // Core is perpetually enabled
    }
    async onDisable() {
        // Core cannot be disabled
    }
    async healthCheck() {
        return {
            status: "healthy",
            message: "Core subsystem is operational.",
            lastCheck: new Date(),
        };
    }
}
export const coreModule = new CoreModule();
export default coreModule;
//# sourceMappingURL=index.js.map