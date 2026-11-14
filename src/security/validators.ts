/**
 * Input sanitization and validation utilities for NEXUS AI.
 */

/**
 * Strips non-printable ASCII control characters and enforces character limits.
 */
export function sanitizeString(input: string, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  // Strip control characters except newline and tab
  const sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Validates whether a string matches Discord Snowflake ID format (17 to 20 digits).
 */
export function validateSnowflake(id: string): boolean {
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
