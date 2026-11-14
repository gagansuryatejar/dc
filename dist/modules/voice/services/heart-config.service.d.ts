/**
 * Heart Configuration Service for NEXUS AI.
 * Manages guild-level auto-join/greeting policies and user-level personality/privacy preferences.
 * Fully persisted in SQLite via Prisma.
 */
import type { HeartPersonalityType, HeartLanguage } from "./heart-personality.service.js";
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
export declare class HeartConfigService {
    /**
     * Retrieves the guild's voice companion settings.
     */
    getGuildSettings(guildId: string): Promise<HeartGuildSettings>;
    /**
     * Updates guild voice companion settings.
     */
    updateGuildSettings(guildId: string, updates: Partial<HeartGuildSettings>): Promise<HeartGuildSettings>;
    /**
     * Toggles auto-join for a guild.
     */
    setAutoJoin(guildId: string, enabled: boolean): Promise<HeartGuildSettings>;
    /**
     * Toggles voice greetings for a guild.
     */
    setGreetings(guildId: string, enabled: boolean): Promise<HeartGuildSettings>;
    /**
     * Adds an allowed voice channel to the whitelist.
     */
    addAllowedChannel(guildId: string, channelId: string): Promise<HeartGuildSettings>;
    /**
     * Removes an allowed voice channel from the whitelist.
     */
    removeAllowedChannel(guildId: string, channelId: string): Promise<HeartGuildSettings>;
    /**
     * Retrieves a member's personalized companion preferences.
     */
    getUserPreferences(guildId: string, userId: string): Promise<HeartUserPreferences>;
    /**
     * Updates a member's companion preferences.
     */
    updateUserPreferences(guildId: string, userId: string, updates: Partial<HeartUserPreferences>): Promise<HeartUserPreferences>;
}
export declare const heartConfigService: HeartConfigService;
