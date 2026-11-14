/**
 * Embed factory helpers for NEXUS AI.
 * Provides consistent, branded embeds across the entire bot.
 */
import { EmbedBuilder } from "discord.js";
export declare const Colors: {
    /** Discord blurple — primary brand colour. */
    readonly PRIMARY: 5793266;
    /** Green — success / confirmation. */
    readonly SUCCESS: 5763719;
    /** Red — error / failure. */
    readonly ERROR: 15548997;
    /** Yellow — warning / caution. */
    readonly WARNING: 16705372;
    /** Dark embed background. */
    readonly DARK: 2829617;
    /** Fuchsia accent. */
    readonly ACCENT: 15418782;
};
/**
 * Create a branded base embed with timestamp and footer.
 */
export declare function createBaseEmbed(): EmbedBuilder;
/**
 * Create a success embed (green).
 */
export declare function createSuccessEmbed(title: string, description?: string): EmbedBuilder;
/**
 * Create an error embed (red).
 */
export declare function createErrorEmbed(title: string, description?: string): EmbedBuilder;
/**
 * Create an info embed (blurple).
 */
export declare function createInfoEmbed(title: string, description?: string): EmbedBuilder;
/**
 * Create a warning embed (yellow).
 */
export declare function createWarningEmbed(title: string, description?: string): EmbedBuilder;
