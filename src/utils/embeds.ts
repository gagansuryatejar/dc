/**
 * Embed factory helpers for NEXUS AI.
 * Provides consistent, branded embeds across the entire bot.
 */

import { EmbedBuilder } from "discord.js";
import { FOOTER_TEXT } from "./constants.js";

// ── Brand colours ───────────────────────────────────────

export const Colors = {
  /** Discord blurple — primary brand colour. */
  PRIMARY: 0x5865f2,
  /** Green — success / confirmation. */
  SUCCESS: 0x57f287,
  /** Red — error / failure. */
  ERROR: 0xed4245,
  /** Yellow — warning / caution. */
  WARNING: 0xfee75c,
  /** Dark embed background. */
  DARK: 0x2b2d31,
  /** Fuchsia accent. */
  ACCENT: 0xeb459e,
} as const;

// ── Embed factories ─────────────────────────────────────

/**
 * Create a branded base embed with timestamp and footer.
 */
export function createBaseEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

/**
 * Create a success embed (green).
 */
export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
  const embed = createBaseEmbed().setColor(Colors.SUCCESS).setTitle(`✅ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Create an error embed (red).
 */
export function createErrorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = createBaseEmbed().setColor(Colors.ERROR).setTitle(`❌ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Create an info embed (blurple).
 */
export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = createBaseEmbed().setColor(Colors.PRIMARY).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

/**
 * Create a warning embed (yellow).
 */
export function createWarningEmbed(title: string, description?: string): EmbedBuilder {
  const embed = createBaseEmbed().setColor(Colors.WARNING).setTitle(`⚠️ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}
