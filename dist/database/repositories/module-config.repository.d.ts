import { ModuleConfig } from '@prisma/client';
export declare class ModuleConfigRepository {
    /**
     * Finds a module config by guild and module name, or creates it with defaults.
     */
    findOrCreate(guildId: string, module: string): Promise<ModuleConfig>;
    /**
     * Checks if a module is enabled for a guild.
     * Returns true by default if no config exists.
     */
    isEnabled(guildId: string, module: string): Promise<boolean>;
    /**
     * Sets the enabled state for a module in a guild.
     * Creates the config entry if it doesn't exist.
     */
    setEnabled(guildId: string, module: string, enabled: boolean): Promise<ModuleConfig>;
    /**
     * Retrieves and parses the JSON settings for a module in a guild.
     */
    getSettings(guildId: string, module: string): Promise<Record<string, unknown>>;
    /**
     * Merges and saves settings for a module in a guild.
     * Creates the config entry if it doesn't exist.
     */
    updateSettings(guildId: string, module: string, settings: Record<string, unknown>): Promise<void>;
    /**
     * Retrieves all module configs for a guild.
     */
    getAllForGuild(guildId: string): Promise<ModuleConfig[]>;
}
