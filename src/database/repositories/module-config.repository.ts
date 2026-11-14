import { ModuleConfig } from '@prisma/client';
import { prisma } from '../client.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('repository:module-config');

export class ModuleConfigRepository {
  /**
   * Finds a module config by guild and module name, or creates it with defaults.
   */
  async findOrCreate(guildId: string, module: string): Promise<ModuleConfig> {
    try {
      const config = await prisma.moduleConfig.upsert({
        where: {
          guildId_module: { guildId, module },
        },
        update: {},
        create: { guildId, module },
      });

      logger.debug({ guildId, module }, 'ModuleConfig findOrCreate completed');
      return config;
    } catch (error) {
      logger.error({ error, guildId, module }, 'Failed to findOrCreate module config');
      throw error;
    }
  }

  /**
   * Checks if a module is enabled for a guild.
   * Returns true by default if no config exists.
   */
  async isEnabled(guildId: string, module: string): Promise<boolean> {
    try {
      const config = await prisma.moduleConfig.findUnique({
        where: {
          guildId_module: { guildId, module },
        },
        select: { enabled: true },
      });

      // Default to true if no config exists
      return config?.enabled ?? true;
    } catch (error) {
      logger.error({ error, guildId, module }, 'Failed to check if module is enabled');
      throw error;
    }
  }

  /**
   * Sets the enabled state for a module in a guild.
   * Creates the config entry if it doesn't exist.
   */
  async setEnabled(guildId: string, module: string, enabled: boolean): Promise<ModuleConfig> {
    try {
      const config = await prisma.moduleConfig.upsert({
        where: {
          guildId_module: { guildId, module },
        },
        update: { enabled },
        create: { guildId, module, enabled },
      });

      logger.debug({ guildId, module, enabled }, 'Module enabled state updated');
      return config;
    } catch (error) {
      logger.error({ error, guildId, module }, 'Failed to set module enabled state');
      throw error;
    }
  }

  /**
   * Retrieves and parses the JSON settings for a module in a guild.
   */
  async getSettings(guildId: string, module: string): Promise<Record<string, unknown>> {
    try {
      const config = await prisma.moduleConfig.findUnique({
        where: {
          guildId_module: { guildId, module },
        },
        select: { settings: true },
      });

      if (!config) {
        return {};
      }

      return JSON.parse(config.settings) as Record<string, unknown>;
    } catch (error) {
      logger.error({ error, guildId, module }, 'Failed to get module settings');
      throw error;
    }
  }

  /**
   * Merges and saves settings for a module in a guild.
   * Creates the config entry if it doesn't exist.
   */
  async updateSettings(
    guildId: string,
    module: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    try {
      const currentSettings = await this.getSettings(guildId, module);
      const merged = { ...currentSettings, ...settings };

      await prisma.moduleConfig.upsert({
        where: {
          guildId_module: { guildId, module },
        },
        update: { settings: JSON.stringify(merged) },
        create: { guildId, module, settings: JSON.stringify(merged) },
      });

      logger.debug({ guildId, module }, 'Module settings updated');
    } catch (error) {
      logger.error({ error, guildId, module }, 'Failed to update module settings');
      throw error;
    }
  }

  /**
   * Retrieves all module configs for a guild.
   */
  async getAllForGuild(guildId: string): Promise<ModuleConfig[]> {
    try {
      return await prisma.moduleConfig.findMany({
        where: { guildId },
        orderBy: { module: 'asc' },
      });
    } catch (error) {
      logger.error({ error, guildId }, 'Failed to get all module configs for guild');
      throw error;
    }
  }
}
