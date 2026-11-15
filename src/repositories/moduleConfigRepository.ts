/**
 * ModuleConfigRepository — Per-guild module enable/disable flags.
 * Allows granular control over which NEXUS modules are active per server.
 */

import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";

export const moduleConfigRepository = {
  async setEnabled(guildId: string, module: string, enabled: boolean) {
    return prisma.moduleConfig.upsert({
      where: { guildId_module: { guildId, module } },
      update: { enabled },
      create: { guildId, module, enabled },
    });
  },

  async isEnabled(guildId: string, module: string): Promise<boolean> {
    const config = await prisma.moduleConfig.findUnique({
      where: { guildId_module: { guildId, module } },
    });
    return config?.enabled ?? true; // default enabled unless explicitly disabled
  },

  async setSettings(guildId: string, module: string, settings: Record<string, unknown>) {
    return prisma.moduleConfig.upsert({
      where: { guildId_module: { guildId, module } },
      update: { settings: JSON.stringify(settings) },
      create: { guildId, module, enabled: true, settings: JSON.stringify(settings) },
    });
  },

  async getSettings(guildId: string, module: string): Promise<Record<string, unknown>> {
    const config = await prisma.moduleConfig.findUnique({
      where: { guildId_module: { guildId, module } },
    });
    if (!config) return {};
    try {
      return JSON.parse(config.settings);
    } catch {
      return {};
    }
  },

  async listForGuild(guildId: string) {
    return prisma.moduleConfig.findMany({ where: { guildId } });
  },
};

logger.debug({ module: "moduleConfigRepository" }, "ModuleConfigRepository initialised");
