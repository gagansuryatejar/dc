/**
 * Voice module definition for NEXUS AI.
 * Voice activity management, milestones, dynamic temporary rooms, and voice assistant.
 */

import { type Client } from "discord.js";
import { VOICE } from "../../config/features.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { voiceCommand } from "./commands/voice.js";
import { heartCommand } from "./commands/heart.js";
import { voiceStateUpdateEvent } from "./events/voice-state-update.js";
import { voiceTrackerService } from "./services/voice-tracker.service.js";
import { tempRoomService } from "./services/temp-room.service.js";
import { heartTrackerService } from "./services/heart-tracker.service.js";
import { voiceAutoJoinService } from "./services/voice-autojoin.service.js";

const logger = createModuleLogger("module:voice");

export class VoiceModule implements NexusModule {
  public readonly name = VOICE;
  public readonly description =
    "Voice activity tracking, sweet AI companion presence, dynamic temporary rooms, and audio advisor";
  public readonly version = "1.1.0";

  public readonly commands = [voiceCommand, heartCommand];
  public readonly events = [voiceStateUpdateEvent];

  async onLoad(client?: Client): Promise<void> {
    logger.info("Initializing Voice Subsystem & Heart Companion Engine...");

    // Run startup sweep of abandoned temporary rooms if client is ready
    if (client) {
      for (const guild of client.guilds.cache.values()) {
        await tempRoomService.sweepAbandonedRooms(guild);
      }
    }
  }

  async onUnload(): Promise<void> {
    voiceTrackerService.destroy();
    heartTrackerService.destroy();
    voiceAutoJoinService.destroy();
    logger.info("Voice Subsystem unloaded.");
  }

  async onEnable(): Promise<void> {
    logger.info("Voice Subsystem enabled.");
  }

  async onDisable(): Promise<void> {
    logger.info("Voice Subsystem disabled.");
  }

  async healthCheck(): Promise<ModuleHealth> {
    return {
      status: "healthy",
      message: "Voice activity tracking and temporary room engine operational.",
      lastCheck: new Date(),
    };
  }
}

export const voiceModule = new VoiceModule();
export default voiceModule;
