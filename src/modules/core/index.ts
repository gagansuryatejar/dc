/**
 * Core module definition for NEXUS AI.
 * Always loaded, foundational subsystem for all bot operations.
 */

import { CORE } from "../../config/features.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { nexusCommand } from "./commands/nexus.js";
import { helpCommand } from "./commands/help.js";
import { adminCommand } from "./commands/admin.js";
import { readyEvent } from "./events/ready.js";
import { guildCreateEvent } from "./events/guild-create.js";
import { guildDeleteEvent } from "./events/guild-delete.js";
import { interactionCreateEvent } from "./events/interaction-create.js";
import { createModuleLogger } from "../../utils/logger.js";

const logger = createModuleLogger("module:core");

export class CoreModule implements NexusModule {
  public readonly name = CORE;
  public readonly description = "Core bot lifecycle, diagnostics, permissions, and server administration";
  public readonly version = "1.0.0";

  public readonly commands = [nexusCommand, helpCommand, adminCommand];
  public readonly events = [readyEvent, guildCreateEvent, guildDeleteEvent, interactionCreateEvent];

  async onLoad(): Promise<void> {
    logger.info("Initializing Core Subsystem...");
  }

  async onUnload(): Promise<void> {
    logger.info("Core Subsystem unloaded.");
  }

  async onEnable(): Promise<void> {
    // Core is perpetually enabled
  }

  async onDisable(): Promise<void> {
    // Core cannot be disabled
  }

  async healthCheck(): Promise<ModuleHealth> {
    return {
      status: "healthy",
      message: "Core subsystem is operational.",
      lastCheck: new Date(),
    };
  }
}

export const coreModule = new CoreModule();
export default coreModule;
