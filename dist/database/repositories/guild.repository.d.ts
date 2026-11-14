import { Guild, Prisma } from '@prisma/client';
export declare class GuildRepository {
    /**
     * Finds a guild by ID, or creates it if it doesn't exist.
     */
    findOrCreate(guildId: string, name: string, ownerId: string): Promise<Guild>;
    /**
     * Finds a guild by its ID.
     * Returns null if not found.
     */
    findById(guildId: string): Promise<Guild | null>;
    /**
     * Updates a guild's data by ID.
     */
    update(guildId: string, data: Prisma.GuildUpdateInput): Promise<Guild>;
    /**
     * Retrieves and parses the JSON settings field for a guild.
     */
    getSettings(guildId: string): Promise<Record<string, unknown>>;
    /**
     * Stringifies and saves the settings object for a guild.
     * Merges with existing settings.
     */
    updateSettings(guildId: string, settings: Record<string, unknown>): Promise<void>;
    /**
     * Retrieves and parses the JSON features field for a guild.
     */
    getFeatures(guildId: string): Promise<Record<string, unknown>>;
    /**
     * Stringifies and saves the features object for a guild.
     * Merges with existing features.
     */
    updateFeatures(guildId: string, features: Record<string, unknown>): Promise<void>;
}
