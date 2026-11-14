/**
 * Daily reward and streak calculation engine for NEXUS AI.
 */
export interface StreakStatus {
    activeStreak: number;
    isClaimable: boolean;
    timeUntilNextMs: number;
    streakLost: boolean;
}
export interface ClaimResult {
    success: boolean;
    xpEarned: number;
    coinsEarned: number;
    newStreak: number;
    cooldownRemainingMs?: number;
}
export declare class StreakService {
    readonly CLAIM_COOLDOWN_MS: number;
    readonly STREAK_GRACE_PERIOD_MS: number;
    /**
     * Evaluates the current daily streak status for a member.
     */
    getStatus(lastDaily: Date | null, currentStreak: number): StreakStatus;
    /**
     * Calculates the rewards and updates streak on claim.
     */
    calculateClaim(lastDaily: Date | null, currentStreak: number): ClaimResult;
}
export declare const streakService: StreakService;
