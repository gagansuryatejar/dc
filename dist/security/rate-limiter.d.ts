/**
 * In-memory rate limiter with automated memory cleanup for NEXUS AI.
 * Essential for resource-constrained hosts (e.g. 4GB RAM HP All-in-One & Android).
 */
export interface RateLimitResult {
    limited: boolean;
    remaining: number;
    resetInMs: number;
}
export declare class RateLimiter {
    readonly windowMs: number;
    readonly maxRequests: number;
    private readonly windows;
    private cleanupTimer?;
    /**
     * @param windowMs Time window in milliseconds (default: 10,000ms = 10s)
     * @param maxRequests Maximum requests allowed within windowMs (default: 5)
     */
    constructor(windowMs?: number, maxRequests?: number);
    /**
     * Consume 1 point for the given key (e.g. userId or userId:command).
     */
    consume(key: string): RateLimitResult;
    /**
     * Check if a key is currently rate limited without consuming a point.
     */
    isLimited(key: string): boolean;
    /**
     * Reset rate limit state for a key.
     */
    reset(key: string): void;
    /**
     * Cleanup expired entries to free RAM.
     */
    cleanup(): void;
    /**
     * Destroy the cleanup interval.
     */
    destroy(): void;
}
/** Default limiter for standard user slash commands (5 commands per 10s) */
export declare const commandLimiter: RateLimiter;
/** Default limiter for administrative operations (2 commands per 10s) */
export declare const adminLimiter: RateLimiter;
/** Default limiter for UI button & select interactions (10 interactions per 10s) */
export declare const interactionLimiter: RateLimiter;
