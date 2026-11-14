/**
 * General-purpose helper utilities for NEXUS AI.
 */
/**
 * Format a duration in milliseconds into a human-readable string.
 * Example: 90061000 → "1d 1h 1m 1s"
 */
export declare function formatDuration(ms: number): string;
/**
 * Format a number with locale-aware thousands separators.
 * Example: 1234567 → "1,234,567"
 */
export declare function formatNumber(num: number): string;
/**
 * Format bytes into human-readable units.
 * Example: 1073741824 → "1.00 GB"
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Truncate a string to max length, appending "…" if truncated.
 */
export declare function truncate(str: string, maxLength: number): string;
/**
 * Capitalise the first letter of a string.
 */
export declare function capitalize(str: string): string;
/**
 * Sleep for a given number of milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
