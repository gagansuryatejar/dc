/**
 * Voice module definition for NEXUS AI.
 * Voice activity management, milestones, dynamic temporary rooms, and voice assistant.
 */
import { VOICE } from "../../config/features.js";
import { createModuleLogger } from "../../utils/logger.js";
import { voiceCommand } from "./commands/voice.js";
import { heartCommand } from "./commands/heart.js";
import { voiceStateUpdateEvent } from "./events/voice-state-update.js";
import { voiceTrackerService } from "./services/voice-tracker.service.js";
import { tempRoomService } from "./services/temp-room.service.js";
import { heartTrackerService } from "./services/heart-tracker.service.js";
import { voiceAutoJoinService } from "./services/voice-autojoin.service.js";
const logger = createModuleLogger("module:voice");
export class VoiceModule {
    name = VOICE;
    description = "Voice activity tracking, sweet AI companion presence, dynamic temporary rooms, and audio advisor";
    version = "1.1.0";
    commands = [voiceCommand, heartCommand];
    events = [voiceStateUpdateEvent];
    async onLoad(client) {
        logger.info("Initializing Voice Subsystem & Heart Companion Engine...");
        // Run startup sweep of abandoned temporary rooms if client is ready
        if (client) {
            for (const guild of client.guilds.cache.values()) {
                await tempRoomService.sweepAbandonedRooms(guild);
            }
        }
    }
    async onUnload() {
        voiceTrackerService.destroy();
        heartTrackerService.destroy();
        voiceAutoJoinService.destroy();
        logger.info("Voice Subsystem unloaded.");
    }
    async onEnable() {
        logger.info("Voice Subsystem enabled.");
    }
    async onDisable() {
        logger.info("Voice Subsystem disabled.");
    }
    async healthCheck() {
        return {
            status: "healthy",
            message: "Voice activity tracking and temporary room engine operational.",
            lastCheck: new Date(),
        };
    }
}
export const voiceModule = new VoiceModule();
export default voiceModule;
//# sourceMappingURL=index.js.map