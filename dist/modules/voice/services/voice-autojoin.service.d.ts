/**
 * Automatic Voice Joining & Sweet Companion Presence Engine for NEXUS AI.
 * Automatically connects to active voice channels, greets members with voice and text,
 * and cleanly disconnects when channels become empty.
 */
import { type VoiceBasedChannel, type GuildMember } from "discord.js";
export declare class VoiceAutoJoinService {
    /** Timers for leaving empty channels keyed by guildId */
    private readonly disconnectTimers;
    /** Cooldown map to prevent spam greeting the same channel in quick succession */
    private readonly greetingCooldowns;
    /**
     * Called when a voice channel state updates.
     */
    handleVoiceUpdate(oldChannel: VoiceBasedChannel | null, newChannel: VoiceBasedChannel | null, member: GuildMember): Promise<void>;
    /**
     * Evaluates auto-joining and greeting when a member joins.
     */
    onMemberJoinedChannel(channel: VoiceBasedChannel, member: GuildMember): Promise<void>;
    /**
     * Delivers sweet greeting both in voice audio and text embed.
     */
    private deliverGreeting;
    /**
     * Called when someone leaves; disconnects if empty to preserve HP All-in-One memory.
     */
    onMemberLeftChannel(channel: VoiceBasedChannel): Promise<void>;
    destroy(): void;
}
export declare const voiceAutoJoinService: VoiceAutoJoinService;
