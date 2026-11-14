import { GuildMember, Prisma } from '@prisma/client';
export declare class MemberRepository {
    /**
     * Finds a member by guild and user, or creates them if they don't exist.
     */
    findOrCreate(guildId: string, userId: string, username: string): Promise<GuildMember>;
    /**
     * Finds a member by guild ID and user ID.
     * Returns null if not found.
     */
    findByGuildAndUser(guildId: string, userId: string): Promise<GuildMember | null>;
    /**
     * Updates a member's data.
     */
    update(guildId: string, userId: string, data: Prisma.GuildMemberUpdateInput): Promise<GuildMember>;
    /**
     * Updates the lastActive timestamp for a member.
     */
    updateActivity(guildId: string, userId: string): Promise<void>;
    /**
     * Retrieves the top members in a guild ranked by XP.
     */
    getTopByXP(guildId: string, limit?: number): Promise<GuildMember[]>;
    /**
     * Retrieves the top members in a guild ranked by voice minutes.
     */
    getTopByVoice(guildId: string, limit?: number): Promise<GuildMember[]>;
    /**
     * Retrieves and parses a member's JSON preferences.
     */
    getPreferences(guildId: string, userId: string): Promise<Record<string, unknown>>;
    /**
     * Merges and saves a member's preferences.
     */
    updatePreferences(guildId: string, userId: string, prefs: Record<string, unknown>): Promise<void>;
    /**
     * Retrieves and parses a member's JSON consent flags.
     */
    getConsentFlags(guildId: string, userId: string): Promise<Record<string, unknown>>;
    /**
     * Merges and saves a member's consent flags.
     */
    updateConsentFlags(guildId: string, userId: string, flags: Record<string, unknown>): Promise<void>;
    /**
     * Returns the total number of members in a guild.
     */
    getMemberCount(guildId: string): Promise<number>;
}
