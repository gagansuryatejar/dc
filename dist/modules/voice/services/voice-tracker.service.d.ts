/**
 * Voice activity and duration tracking engine for NEXUS AI.
 * Tracks member voice presence, awards voice XP, and celebrates voice milestones.
 */
import { type Client, type Guild } from "discord.js";
export interface ActiveVoiceSession {
    guildId: string;
    userId: string;
    channelId: string;
    joinedAt: number;
}
export interface VoiceMilestone {
    minutes: number;
    badgeId: string;
    name: string;
    rewardXp: number;
    rewardCoins: number;
    emoji: string;
}
export declare const VOICE_MILESTONES: VoiceMilestone[];
export declare class VoiceTrackerService {
    /** Active voice sessions keyed by "guildId:userId" */
    private readonly sessions;
    private syncTimer?;
    constructor();
    private getKey;
    /**
     * Called when a member joins a voice channel.
     */
    onMemberJoin(guildId: string, userId: string, username: string, channelId: string): Promise<void>;
    /**
     * Called when a member leaves a voice channel or switches channels.
     */
    onMemberLeave(guildId: string, userId: string, _channelId: string, client: Client): Promise<{
        minutesSpent: number;
        xpEarned: number;
    } | null>;
    /**
     * Broadcast milestone achievement cards in guild announcement or welcome channels.
     */
    private announceMilestones;
    /**
     * Periodically flush active session duration so data isn't lost during unexpected server restarts.
     */
    syncActiveSessions(): Promise<void>;
    /**
     * Get active voice session info for a member, if any.
     */
    getActiveSession(guildId: string, userId: string): ActiveVoiceSession | undefined;
    /**
     * Inspect all currently occupied voice channels in a guild.
     */
    getActiveRooms(guild: Guild): Array<{
        channelId: string;
        name: string;
        memberCount: number;
        members: string[];
    }>;
    destroy(): void;
}
export declare const voiceTrackerService: VoiceTrackerService;
