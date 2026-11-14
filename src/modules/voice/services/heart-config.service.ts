/**
 * Heart Configuration Service for NEXUS AI.
 * Manages guild-level auto-join/greeting policies and user-level personality/privacy preferences.
 * Fully persisted in SQLite via Prisma.
 */

import { prisma, guildRepository, memberRepository } from "../../../database/index.js";
import type { HeartPersonalityType, HeartLanguage } from "./heart-personality.service.js";
import { createModuleLogger } from "../../../utils/logger.js";

const logger = createModuleLogger("voice:heart-config");

export interface HeartGuildSettings {
  autojoinEnabled: boolean;
  greetingsEnabled: boolean;
  allowedChannels: string[];
  excludedChannels: string[];
  defaultPersonality: HeartPersonalityType;
  defaultLanguage: HeartLanguage;
}

export interface HeartUserPreferences {
  personality: HeartPersonalityType;
  greetingsEnabled: boolean;
  appreciationPings: boolean;
  language: HeartLanguage;
  activeTitle?: string;
  decorations: string[];
}

const DEFAULT_GUILD_SETTINGS: HeartGuildSettings = {
  autojoinEnabled: false,
  greetingsEnabled: true,
  allowedChannels: [],
  excludedChannels: [],
  defaultPersonality: "sweet",
  defaultLanguage: "en",
};

const DEFAULT_USER_PREFS: HeartUserPreferences = {
  personality: "sweet",
  greetingsEnabled: true,
  appreciationPings: true,
  language: "en",
  decorations: [],
};

export class HeartConfigService {
  /**
   * Retrieves the guild's voice companion settings.
   */
  async getGuildSettings(guildId: string): Promise<HeartGuildSettings> {
    try {
      const guild = await guildRepository.findById(guildId);
      if (!guild || !guild.settings) return { ...DEFAULT_GUILD_SETTINGS };

      const parsed = JSON.parse(guild.settings);
      const voiceHeart = parsed.voiceHeart || {};

      return {
        autojoinEnabled: typeof voiceHeart.autojoinEnabled === "boolean" ? voiceHeart.autojoinEnabled : DEFAULT_GUILD_SETTINGS.autojoinEnabled,
        greetingsEnabled: typeof voiceHeart.greetingsEnabled === "boolean" ? voiceHeart.greetingsEnabled : DEFAULT_GUILD_SETTINGS.greetingsEnabled,
        allowedChannels: Array.isArray(voiceHeart.allowedChannels) ? voiceHeart.allowedChannels : DEFAULT_GUILD_SETTINGS.allowedChannels,
        excludedChannels: Array.isArray(voiceHeart.excludedChannels) ? voiceHeart.excludedChannels : DEFAULT_GUILD_SETTINGS.excludedChannels,
        defaultPersonality: voiceHeart.defaultPersonality || DEFAULT_GUILD_SETTINGS.defaultPersonality,
        defaultLanguage: voiceHeart.defaultLanguage || DEFAULT_GUILD_SETTINGS.defaultLanguage,
      };
    } catch (err) {
      logger.error({ err, guildId }, "Failed to load guild voice heart settings");
      return { ...DEFAULT_GUILD_SETTINGS };
    }
  }

  /**
   * Updates guild voice companion settings.
   */
  async updateGuildSettings(guildId: string, updates: Partial<HeartGuildSettings>): Promise<HeartGuildSettings> {
    const current = await this.getGuildSettings(guildId);
    const updated: HeartGuildSettings = { ...current, ...updates };

    await guildRepository.updateSettings(guildId, { voiceHeart: updated });
    logger.info({ guildId, updated }, "Updated guild voice heart settings");
    return updated;
  }

  /**
   * Toggles auto-join for a guild.
   */
  async setAutoJoin(guildId: string, enabled: boolean): Promise<HeartGuildSettings> {
    return this.updateGuildSettings(guildId, { autojoinEnabled: enabled });
  }

  /**
   * Toggles voice greetings for a guild.
   */
  async setGreetings(guildId: string, enabled: boolean): Promise<HeartGuildSettings> {
    return this.updateGuildSettings(guildId, { greetingsEnabled: enabled });
  }

  /**
   * Adds an allowed voice channel to the whitelist.
   */
  async addAllowedChannel(guildId: string, channelId: string): Promise<HeartGuildSettings> {
    const current = await this.getGuildSettings(guildId);
    if (!current.allowedChannels.includes(channelId)) {
      current.allowedChannels.push(channelId);
      return this.updateGuildSettings(guildId, { allowedChannels: current.allowedChannels });
    }
    return current;
  }

  /**
   * Removes an allowed voice channel from the whitelist.
   */
  async removeAllowedChannel(guildId: string, channelId: string): Promise<HeartGuildSettings> {
    const current = await this.getGuildSettings(guildId);
    const filtered = current.allowedChannels.filter((c) => c !== channelId);
    return this.updateGuildSettings(guildId, { allowedChannels: filtered });
  }

  /**
   * Retrieves a member's personalized companion preferences.
   */
  async getUserPreferences(guildId: string, userId: string): Promise<HeartUserPreferences> {
    try {
      const member = await memberRepository.findByGuildAndUser(guildId, userId);
      if (!member || !member.preferences) return { ...DEFAULT_USER_PREFS };

      const parsed = JSON.parse(member.preferences);
      const heart = parsed.heart || {};

      return {
        personality: heart.personality || DEFAULT_USER_PREFS.personality,
        greetingsEnabled: typeof heart.greetingsEnabled === "boolean" ? heart.greetingsEnabled : DEFAULT_USER_PREFS.greetingsEnabled,
        appreciationPings: typeof heart.appreciationPings === "boolean" ? heart.appreciationPings : DEFAULT_USER_PREFS.appreciationPings,
        language: heart.language || DEFAULT_USER_PREFS.language,
        activeTitle: heart.activeTitle,
        decorations: Array.isArray(heart.decorations) ? heart.decorations : DEFAULT_USER_PREFS.decorations,
      };
    } catch (err) {
      logger.error({ err, guildId, userId }, "Failed to read user heart preferences");
      return { ...DEFAULT_USER_PREFS };
    }
  }

  /**
   * Updates a member's companion preferences.
   */
  async updateUserPreferences(
    guildId: string,
    userId: string,
    updates: Partial<HeartUserPreferences>,
  ): Promise<HeartUserPreferences> {
    const current = await this.getUserPreferences(guildId, userId);
    const updated: HeartUserPreferences = { ...current, ...updates };

    const member = await memberRepository.findByGuildAndUser(guildId, userId);
    const parsed = member?.preferences ? JSON.parse(member.preferences) : {};
    parsed.heart = updated;

    await prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: { preferences: JSON.stringify(parsed) },
    });

    return updated;
  }
}

export const heartConfigService = new HeartConfigService();
