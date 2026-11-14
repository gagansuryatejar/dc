/**
 * VoiceStateUpdate event handler.
 * Dispatches voice activity session tracking and triggers temporary room cleanup on member departures.
 */
import { Events } from "discord.js";
import { VOICE } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { voiceTrackerService } from "../services/voice-tracker.service.js";
import { tempRoomService } from "../services/temp-room.service.js";
import { heartTrackerService } from "../services/heart-tracker.service.js";
import { voiceAutoJoinService } from "../services/voice-autojoin.service.js";
const logger = createModuleLogger("event:voiceStateUpdate");
export const voiceStateUpdateEvent = {
    name: Events.VoiceStateUpdate,
    once: false,
    module: VOICE,
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot)
            return;
        const guild = newState.guild || oldState.guild;
        const guildId = guild.id;
        const userId = member.id;
        const username = member.user.username;
        try {
            // 1. Member joined a channel
            if (!oldState.channelId && newState.channelId) {
                await voiceTrackerService.onMemberJoin(guildId, userId, username, newState.channelId);
                heartTrackerService.onMemberJoin(guildId, userId, username, newState.channelId, newState.serverDeaf ?? false, newState.channel?.members.filter((m) => !m.user.bot).size ?? 1);
                await voiceAutoJoinService.handleVoiceUpdate(oldState.channel, newState.channel, member);
                return;
            }
            // 2. Member left a channel
            if (oldState.channelId && !newState.channelId) {
                await voiceTrackerService.onMemberLeave(guildId, userId, oldState.channelId, newState.client);
                await heartTrackerService.onMemberLeave(newState.client, guildId, userId);
                await tempRoomService.handleRoomState(guild, oldState.channelId);
                await voiceAutoJoinService.handleVoiceUpdate(oldState.channel, newState.channel, member);
                return;
            }
            // 3. Member switched channels
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                await voiceTrackerService.onMemberLeave(guildId, userId, oldState.channelId, newState.client);
                await heartTrackerService.onMemberLeave(newState.client, guildId, userId);
                await tempRoomService.handleRoomState(guild, oldState.channelId);
                await voiceTrackerService.onMemberJoin(guildId, userId, username, newState.channelId);
                heartTrackerService.onMemberJoin(guildId, userId, username, newState.channelId, newState.serverDeaf ?? false, newState.channel?.members.filter((m) => !m.user.bot).size ?? 1);
                await voiceAutoJoinService.handleVoiceUpdate(oldState.channel, newState.channel, member);
                return;
            }
            // 4. Voice state change within same channel (deaf, mute)
            if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
                heartTrackerService.onVoiceStateChange(guildId, userId, newState.serverDeaf ?? false, newState.channel?.members.filter((m) => !m.user.bot).size ?? 1);
            }
        }
        catch (error) {
            logger.error({ error, userId, guildId }, "Error processing VoiceStateUpdate event");
        }
    },
};
//# sourceMappingURL=voice-state-update.js.map