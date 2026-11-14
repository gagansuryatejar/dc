/**
 * Sweet Voice Appreciation & Heart Milestone Engine for NEXUS AI.
 * Tracks member voice presence, enforces active-participation fair play rules,
 * celebrates progressive milestones (15m, 30m, 1h, 2h, 3h, 5h), and awards badges & coins.
 */
import { type Client } from "discord.js";
export interface HeartMilestoneConfig {
    key: string;
    name: string;
    minutes: number;
    xp: number;
    coins: number;
    badgeId?: string;
    emoji: string;
    description: string;
}
export declare const HEART_MILESTONES: HeartMilestoneConfig[];
export interface ActiveHeartSession {
    guildId: string;
    userId: string;
    username: string;
    channelId: string;
    joinedAt: number;
    lastActiveAt: number;
    serverDeaf: boolean;
    channelOccupancy: number;
}
export declare class HeartTrackerService {
    /** Map of active sessions keyed by "guildId:userId" */
    private readonly sessions;
    private checkInterval?;
    constructor();
    private getKey;
    /**
     * Called when a member joins a voice channel.
     */
    onMemberJoin(guildId: string, userId: string, username: string, channelId: string, serverDeaf: boolean, occupancy: number): void;
    /**
     * Called when a member's voice state updates (deaf, mute, channel switch).
     */
    onVoiceStateChange(guildId: string, userId: string, serverDeaf: boolean, occupancy: number): void;
    /**
     * Called when a member leaves a voice channel.
     */
    onMemberLeave(_client: Client | undefined, guildId: string, userId: string): Promise<number>;
    /**
     * Evaluates active sessions periodically and awards unlocked milestones.
     */
    evaluateActiveSessions(client?: Client): Promise<void>;
    /**
     * Checks if a milestone has already been claimed; if not, grants rewards and celebrates.
     */
    checkAndAwardMilestone(client: Client | undefined, session: ActiveHeartSession, milestone: HeartMilestoneConfig, totalMinutes: number): Promise<boolean>;
    /**
     * Delivers celebration card and plays voice TTS.
     */
    private deliverCelebration;
    /**
     * Persists accumulated voice time to database and daily metrics.
     */
    private recordParticipationTime;
    /**
     * Retrieves full heart stats for a member.
     */
    getMemberHeartStats(guildId: string, userId: string, username: string): Promise<{
        userId: string;
        username: string;
        totalVoiceMinutes: number;
        activeSessionMinutes: number;
        isCurrentlyInVoice: boolean;
        coins: number;
        xp: number;
        level: number;
        personality: import("./heart-personality.service.js").HeartPersonalityType;
        claimedMilestonesCount: number;
        totalMilestonesCount: number;
        milestones: {
            unlocked: boolean;
            progressPercent: number;
            key: string;
            name: string;
            minutes: number;
            xp: number;
            coins: number;
            badgeId?: string;
            emoji: string;
            description: string;
        }[];
    }>;
    destroy(): void;
}
export declare const heartTrackerService: HeartTrackerService;
