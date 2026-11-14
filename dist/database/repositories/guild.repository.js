import { prisma } from '../client.js';
import { createModuleLogger } from '../../utils/logger.js';
const logger = createModuleLogger('repository:guild');
export class GuildRepository {
    /**
     * Finds a guild by ID, or creates it if it doesn't exist.
     */
    async findOrCreate(guildId, name, ownerId) {
        try {
            const guild = await prisma.guild.upsert({
                where: { id: guildId },
                update: { name, ownerId },
                create: { id: guildId, name, ownerId },
            });
            logger.debug({ guildId }, 'Guild findOrCreate completed');
            return guild;
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to findOrCreate guild');
            throw error;
        }
    }
    /**
     * Finds a guild by its ID.
     * Returns null if not found.
     */
    async findById(guildId) {
        try {
            return await prisma.guild.findUnique({
                where: { id: guildId },
            });
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to find guild by ID');
            throw error;
        }
    }
    /**
     * Updates a guild's data by ID.
     */
    async update(guildId, data) {
        try {
            const guild = await prisma.guild.update({
                where: { id: guildId },
                data,
            });
            logger.debug({ guildId }, 'Guild updated');
            return guild;
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to update guild');
            throw error;
        }
    }
    /**
     * Retrieves and parses the JSON settings field for a guild.
     */
    async getSettings(guildId) {
        try {
            const guild = await prisma.guild.findUnique({
                where: { id: guildId },
                select: { settings: true },
            });
            if (!guild) {
                return {};
            }
            return JSON.parse(guild.settings);
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to get guild settings');
            throw error;
        }
    }
    /**
     * Stringifies and saves the settings object for a guild.
     * Merges with existing settings.
     */
    async updateSettings(guildId, settings) {
        try {
            const currentSettings = await this.getSettings(guildId);
            const merged = { ...currentSettings, ...settings };
            await prisma.guild.update({
                where: { id: guildId },
                data: { settings: JSON.stringify(merged) },
            });
            logger.debug({ guildId }, 'Guild settings updated');
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to update guild settings');
            throw error;
        }
    }
    /**
     * Retrieves and parses the JSON features field for a guild.
     */
    async getFeatures(guildId) {
        try {
            const guild = await prisma.guild.findUnique({
                where: { id: guildId },
                select: { features: true },
            });
            if (!guild) {
                return {};
            }
            return JSON.parse(guild.features);
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to get guild features');
            throw error;
        }
    }
    /**
     * Stringifies and saves the features object for a guild.
     * Merges with existing features.
     */
    async updateFeatures(guildId, features) {
        try {
            const currentFeatures = await this.getFeatures(guildId);
            const merged = { ...currentFeatures, ...features };
            await prisma.guild.update({
                where: { id: guildId },
                data: { features: JSON.stringify(merged) },
            });
            logger.debug({ guildId }, 'Guild features updated');
        }
        catch (error) {
            logger.error({ error, guildId }, 'Failed to update guild features');
            throw error;
        }
    }
}
//# sourceMappingURL=guild.repository.js.map