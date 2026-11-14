import { prisma } from '../client.js';
import { createModuleLogger } from '../../utils/logger.js';
const logger = createModuleLogger('repository:member');
export class MemberRepository {
    /**
     * Finds a member by guild and user, or creates them if they don't exist.
     */
    async findOrCreate(guildId, userId, username) {
        try {
            const member = await prisma.guildMember.upsert({
                where: {
                    guildId_userId: { guildId, userId },
                },
                update: { username },
                create: { guildId, userId, username },
            });
            logger.debug({ guildId, userId }, 'Member findOrCreate completed');
            return member;
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to findOrCreate member');
            throw error;
        }
    }
    /**
     * Finds a member by guild ID and user ID.
     * Returns null if not found.
     */
    async findByGuildAndUser(guildId, userId) {
        try {
            return await prisma.guildMember.findUnique({
                where: {
                    guildId_userId: { guildId, userId },
                },
            });
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to find member');
            throw error;
        }
    }
    /**
     * Updates a member's data.
     */
    async update(guildId, userId, data) {
        try {
            const member = await prisma.guildMember.update({
                where: {
                    guildId_userId: { guildId, userId },
                },
                data,
            });
            logger.debug({ guildId, userId }, 'Member updated');
            return member;
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to update member');
            throw error;
        }
    }
    /**
     * Updates the lastActive timestamp for a member.
     */
    async updateActivity(guildId, userId) {
        try {
            await prisma.guildMember.update({
                where: {
                    guildId_userId: { guildId, userId },
                },
                data: { lastActive: new Date() },
            });
            logger.debug({ guildId, userId }, 'Member activity updated');
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to update member activity');
            throw error;
        }
    }
    /**
     * Retrieves the top members in a guild ranked by XP.
     */
    async getTopByXP(guildId, limit = 10) {
        try {
            return await prisma.guildMember.findMany({
                where: { guildId, isBanned: false },
                orderBy: { xp: 'desc' },
                take: limit,
            });
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to get top members by XP');
            throw error;
        }
    }
    /**
     * Retrieves the top members in a guild ranked by voice minutes.
     */
    async getTopByVoice(guildId, limit = 10) {
        try {
            return await prisma.guildMember.findMany({
                where: { guildId, isBanned: false },
                orderBy: { voiceMinutes: 'desc' },
                take: limit,
            });
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to get top members by voice');
            throw error;
        }
    }
    /**
     * Retrieves and parses a member's JSON preferences.
     */
    async getPreferences(guildId, userId) {
        try {
            const member = await prisma.guildMember.findUnique({
                where: {
                    guildId_userId: { guildId, userId },
                },
                select: { preferences: true },
            });
            if (!member) {
                return {};
            }
            return JSON.parse(member.preferences);
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to get member preferences');
            throw error;
        }
    }
    /**
     * Merges and saves a member's preferences.
     */
    async updatePreferences(guildId, userId, prefs) {
        try {
            const currentPrefs = await this.getPreferences(guildId, userId);
            const merged = { ...currentPrefs, ...prefs };
            await prisma.guildMember.update({
                where: {
                    guildId_userId: { guildId, userId },
                },
                data: { preferences: JSON.stringify(merged) },
            });
            logger.debug({ guildId, userId }, 'Member preferences updated');
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to update member preferences');
            throw error;
        }
    }
    /**
     * Retrieves and parses a member's JSON consent flags.
     */
    async getConsentFlags(guildId, userId) {
        try {
            const member = await prisma.guildMember.findUnique({
                where: {
                    guildId_userId: { guildId, userId },
                },
                select: { consentFlags: true },
            });
            if (!member) {
                return {};
            }
            return JSON.parse(member.consentFlags);
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to get member consent flags');
            throw error;
        }
    }
    /**
     * Merges and saves a member's consent flags.
     */
    async updateConsentFlags(guildId, userId, flags) {
        try {
            const currentFlags = await this.getConsentFlags(guildId, userId);
            const merged = { ...currentFlags, ...flags };
            await prisma.guildMember.update({
                where: {
                    guildId_userId: { guildId, userId },
                },
                data: { consentFlags: JSON.stringify(merged) },
            });
            logger.debug({ guildId, userId }, 'Member consent flags updated');
        }
        catch (error) {
            logger.error({ error, guildId, userId }, 'Failed to update member consent flags');
            throw error;
        }
    }
    /**
     * Returns the total number of members in a guild.
     */
    async getMemberCount(guildId) {
        try {
            return await prisma.guildMember.count({
                where: { guildId },
            });
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to get member count');
            throw error;
        }
    }
}
//# sourceMappingURL=member.repository.js.map