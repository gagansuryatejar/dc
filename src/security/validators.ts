/**
 * NEXUS AI — Input Sanitization & Validation Utilities
 * Enterprise-grade input validation to prevent injection, XSS, and abuse.
 */

import { config } from "../config/index.js";

/**
 * Strips non-printable ASCII control characters and enforces character limits.
 */
export function sanitizeString(input: string, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Validates whether a string matches Discord Snowflake ID format (17 to 20 digits).
 */
export function validateSnowflake(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^\d{17,20}$/.test(id);
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL.
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Escapes Discord markdown characters to prevent unintentional formatting or mention exploits.
 */
export function escapeMarkdown(text: string): string {
  if (typeof text !== "string") return "";
  return text.replace(/([*_`~|\\])/g, "\\$1");
}

/**
 * Validates an IANA Timezone identifier (e.g. "Asia/Kolkata", "UTC", "America/New_York").
 */
export function validateTimezone(tz: string): boolean {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Supported bot locales */
export const SUPPORTED_LOCALES = ["en", "te"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Validates if the given locale code is supported.
 */
export function validateLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Validates a Discord role name length and content.
 */
export function validateRoleName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Sanitizes a reason string for moderation actions.
 */
export function sanitizeReason(reason: string, maxLength = 512): string {
  return sanitizeString(reason, maxLength);
}

/**
 * Returns true if the provided guild ID matches the configured dev guild (if set).
 */
export function isDevGuild(guildId: string | null): boolean {
  if (!guildId || !config.discord.guildId) return false;
  return guildId === config.discord.guildId;
}
