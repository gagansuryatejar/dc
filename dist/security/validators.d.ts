/**
 * Input sanitization and validation utilities for NEXUS AI.
 */
/**
 * Strips non-printable ASCII control characters and enforces character limits.
 */
export declare function sanitizeString(input: string, maxLength?: number): string;
/**
 * Validates whether a string matches Discord Snowflake ID format (17 to 20 digits).
 */
export declare function validateSnowflake(id: string): boolean;
/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL.
 */
export declare function validateUrl(url: string): boolean;
/**
 * Escapes Discord markdown characters to prevent unintentional formatting or mention exploits.
 */
export declare function escapeMarkdown(text: string): string;
/**
 * Validates an IANA Timezone identifier (e.g. "Asia/Kolkata", "UTC", "America/New_York").
 */
export declare function validateTimezone(tz: string): boolean;
/** Supported bot locales */
export declare const SUPPORTED_LOCALES: readonly ["en", "te"];
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
/**
 * Validates if the given locale code is supported.
 */
export declare function validateLocale(locale: string): locale is SupportedLocale;
