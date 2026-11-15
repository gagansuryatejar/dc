/**
 * GuildRepository — Persistence for Discord guild (server) records.
 * Each guild has independent settings, independent database records.
 */

import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";

export type GuildInput = {
  id: string;
  name: string;
  ownerId: string;
  locale?: string;
  timezone?: string;
};

export type GuildUpdate = Partial<{
  name: string;
  locale: string;
  timezone: string;
  welcomeChannel: string | null;
  logChannel: string | null;
  announcementChannel: string | null;
}>;

export const guildRepository = {
  /**
   * Find a guild by ID, or create it if it does not exist.
   */
  async findOrCreate(input: GuildInput) {
    return prisma.guild.upsert({
      where: { id: input.id },
      update: { name: input.name },
      create: {
        id: input.id,
        name: input.name,
        ownerId: input.ownerId,
        locale: input.locale ?? "en",
        timezone: input.timezone ?? "UTC",
      },
    });
  },

  async findById(id: string) {
    return prisma.guild.findUnique({ where: { id } });
  },

  async update(id: string, data: GuildUpdate) {
    return prisma.guild.update({
      where: { id },
      data: {
        ...data,
        welcomeChannel: data.welcomeChannel === undefined ? undefined : data.welcomeChannel,
        logChannel: data.logChannel === undefined ? undefined : data.logChannel,
        announcementChannel:
          data.announcementChannel === undefined ? undefined : data.announcementChannel,
      },
    });
  },

  async setFeatureFlag(id: string, module: string, enabled: boolean) {
    const guild = await prisma.guild.findUnique({ where: { id } });
    if (!guild) throw new Error(`Guild ${id} not found`);
    const features = JSON.parse(guild.features) as Record<string, boolean>;
    features[module] = enabled;
    return prisma.guild.update({
      where: { id },
      data: { features: JSON.stringify(features) },
    });
  },

  async isFeatureEnabled(id: string, module: string): Promise<boolean> {
    const guild = await prisma.guild.findUnique({ where: { id } });
    if (!guild) return false;
    const features = JSON.parse(guild.features) as Record<string, boolean>;
    return !!features[module];
  },

  async count() {
    return prisma.guild.count();
  },
};

logger.debug({ module: "guildRepository" }, "GuildRepository initialised");
