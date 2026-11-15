/**
 * NEXUS AI — In-Memory Sliding-Window Rate Limiter
 * Prevents command spam and duplicate processing. Memory-bounded with periodic GC.
 */

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetInMs: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, number[]>();
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * @param windowMs Time window in milliseconds (default: 10,000ms = 10s)
   * @param maxRequests Maximum requests allowed within windowMs (default: 5)
   */
  constructor(
    public readonly windowMs: number = 10_000,
    public readonly maxRequests: number = 5,
  ) {
    // Periodic garbage collection every 60 seconds to prevent unbounded Map growth
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Consume 1 point for the given key (e.g. userId or userId:command).
   */
  consume(key: string): RateLimitResult {
    const now = Date.now();
    const timestamps = this.windows.get(key) ?? [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      const oldest = validTimestamps[0] ?? now;
      const resetInMs = Math.max(0, this.windowMs - (now - oldest));
      return {
        limited: true,
        remaining: 0,
        resetInMs,
      };
    }

    validTimestamps.push(now);
    this.windows.set(key, validTimestamps);

    return {
      limited: false,
      remaining: this.maxRequests - validTimestamps.length,
      resetInMs: this.windowMs,
    };
  }

  /** Check if a key is currently rate limited without consuming a point. */
  isLimited(key: string): boolean {
    const now = Date.now();
    const timestamps = this.windows.get(key);
    if (!timestamps || timestamps.length === 0) return false;
    const valid = timestamps.filter((t) => now - t < this.windowMs);
    return valid.length >= this.maxRequests;
  }

  /** Reset rate limit state for a key. */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /** Cleanup expired entries to free RAM. */
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.windows.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs);
      if (valid.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, valid);
      }
    }
  }

  /** Destroy the cleanup interval and clear all state. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.windows.clear();
  }
}

/** Default limiter for standard user slash commands (5 commands per 10s) */
export const commandLimiter = new RateLimiter(10_000, 5);

/** Default limiter for administrative operations (2 commands per 10s) */
export const adminLimiter = new RateLimiter(10_000, 2);

/** Default limiter for UI button & select interactions (10 interactions per 10s) */
export const interactionLimiter = new RateLimiter(10_000, 10);
