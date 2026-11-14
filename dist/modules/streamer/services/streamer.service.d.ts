/**
 * Streamer & Content Creator Subsystem for NEXUS AI.
 * Handles streamer profiles, Discord Go Live activity tracking, live roles,
 * airtime statistics, privacy protection, and streamer leaderboards.
 */
import { Guild, GuildMember } from "discord.js";
export interface ActiveStreamSession {
    userId: string;
    guildId: string;
    startTime: number;
    streamTitle?: string;
    streamUrl?: string;
    gameName?: string;
    platform?: string;
}
export interface StreamerProfileData {
    id: string;
    guildId: string;
    userId: string;
    platform: string | null;
    channelUrl: string | null;
    bio: string | null;
    notifyGoLive: boolean;
    liveRole: string | null;
    customMessage: string | null;
    totalStreams: number;
    totalStreamMinutes: number;
    lastStreamAt: Date | null;
}
export declare class StreamerService {
    private readonly activeStreams;
    /**
     * Retrieves or initializes a streamer profile.
     */
    getProfile(guildId: string, userId: string): Promise<StreamerProfileData>;
    /**
     * Updates a member's streamer profile and privacy settings.
     */
    upsertProfile(guildId: string, userId: string, data: {
        platform?: string;
        channelUrl?: string;
        bio?: string;
        notifyGoLive?: boolean;
        customMessage?: string;
    }): Promise<StreamerProfileData>;
    /**
     * Called when a member starts streaming (Discord Go Live or external stream).
     */
    onStreamStart(guild: Guild, member: GuildMember, details: {
        streamTitle?: string;
        streamUrl?: string;
        gameName?: string;
        platform?: string;
    }): Promise<void>;
    /**
     * Called when a member finishes streaming.
     */
    onStreamEnd(guild: Guild, member: GuildMember): Promise<{
        minutesStreamed: number;
    } | null>;
    /**
     * Retrieves active stream session if live.
     */
    getActiveSession(guildId: string, userId: string): ActiveStreamSession | undefined;
    /**
     * Retrieves streamer airtime leaderboard for a guild.
     */
    getLeaderboard(guildId: string, limit?: number): Promise<Array<{
        userId: string;
        totalStreamMinutes: number;
        totalStreams: number;
    }>>;
}
export declare const streamerService: StreamerService;
