/**
 * Punishment & Infraction Management Engine for NEXUS AI.
 * Handles progressive warning escalation, timeouts, kicks, bans,
 * pardoning workflows, and persistent infraction logs.
 */
import { Guild, GuildMember as DiscordGuildMember } from "discord.js";
export interface InfractionRecord {
    id: string;
    guildId: string;
    userId: string;
    moderatorId: string;
    type: string;
    reason: string;
    durationMinutes: number | null;
    active: boolean;
    createdAt: Date;
}
export interface EscalationResult {
    action: "none" | "warn" | "timeout" | "kick_review";
    durationMinutes?: number;
    warningsCount: number;
}
export declare class PunishmentService {
    /**
     * Evaluates punishment escalation based on cumulative active warnings.
     * Escalation ladder:
     * 1 warning: Notice / Formal warning
     * 2 warnings: 10-minute timeout
     * 3 warnings: 60-minute timeout
     * 4+ warnings: 1440-minute (24h) timeout / Kick review
     */
    evaluateEscalation(activeWarnings: number): EscalationResult;
    /**
     * Records an infraction (warn, timeout, kick, ban) and updates member warning count.
     */
    recordInfraction(guildId: string, userId: string, moderatorId: string, type: "warn" | "timeout" | "mute" | "kick" | "ban", reason: string, durationMinutes?: number): Promise<{
        infraction: InfractionRecord;
        escalation: EscalationResult;
    }>;
    /**
     * Applies a Discord timeout to a guild member.
     */
    applyTimeout(member: DiscordGuildMember, durationMinutes: number, reason: string, moderatorId: string): Promise<void>;
    /**
     * Removes an existing timeout from a member.
     */
    removeTimeout(member: DiscordGuildMember, reason: string, moderatorId: string): Promise<void>;
    /**
     * Kicks a member from the guild.
     */
    kickMember(member: DiscordGuildMember, reason: string, moderatorId: string): Promise<void>;
    /**
     * Bans a user from the guild.
     */
    banUser(guild: Guild, userId: string, reason: string, moderatorId: string, deleteMessageDays?: number): Promise<void>;
    /**
     * Unbans a user from the guild.
     */
    unbanUser(guild: Guild, userId: string, reason: string, moderatorId: string): Promise<void>;
    /**
     * Fetches infraction history for a specific member.
     */
    getHistory(guildId: string, userId: string): Promise<InfractionRecord[]>;
    /**
     * Pardons a previous warning infraction, removing it from active penalty calculation.
     */
    pardonInfraction(guildId: string, infractionId: string, moderatorId: string): Promise<boolean>;
}
export declare const punishmentService: PunishmentService;
