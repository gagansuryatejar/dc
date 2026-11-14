/**
 * Streamer & Content Creator Module definition for NEXUS AI.
 */

import { STREAMER } from "../../config/features.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { streamerCommand } from "./commands/streamer.js";
import { watchPartyCommand } from "./commands/watchparty.js";
import { streamPresenceEvent } from "./events/presence-update.js";
import { watchPartyButtonsEvent } from "./events/watchparty-buttons.js";

const logger = createModuleLogger("module:streamer");

export class StreamerModule implements NexusModule {
  public readonly name = STREAMER;
  public readonly version = "1.0.0";
  public readonly description =
    "Content creator profiles, Discord Go Live tracking, streamer protection, watch parties, and creator lounges";

  public readonly commands = [streamerCommand, watchPartyCommand];
  public readonly events = [streamPresenceEvent, watchPartyButtonsEvent];

  async onLoad(): Promise<void> {
    logger.info("Initializing Streamer & Creator Subsystem...");
  }

  async onUnload(): Promise<void> {
    logger.info("Streamer Subsystem unloaded.");
  }

  async onEnable(): Promise<void> {
    logger.info("Streamer Subsystem enabled.");
  }

  async onDisable(): Promise<void> {
    logger.info("Streamer Subsystem disabled.");
  }

  async healthCheck(): Promise<ModuleHealth> {
    return {
      status: "healthy",
      message: "Streamer mode and watch party engine operational",
      lastCheck: new Date(),
    };
  }
}

export const streamerModule = new StreamerModule();
