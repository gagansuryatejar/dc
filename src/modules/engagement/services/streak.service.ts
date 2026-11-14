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

export class StreakService {
  public readonly CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
  public readonly STREAK_GRACE_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 hours to maintain streak

  /**
   * Evaluates the current daily streak status for a member.
   */
  getStatus(lastDaily: Date | null, currentStreak: number): StreakStatus {
    if (!lastDaily) {
      return {
        activeStreak: 0,
        isClaimable: true,
        timeUntilNextMs: 0,
        streakLost: false,
      };
    }

    const now = Date.now();
    const elapsed = now - lastDaily.getTime();

    if (elapsed < this.CLAIM_COOLDOWN_MS) {
      return {
        activeStreak: currentStreak,
        isClaimable: false,
        timeUntilNextMs: this.CLAIM_COOLDOWN_MS - elapsed,
        streakLost: false,
      };
    }

    if (elapsed > this.STREAK_GRACE_PERIOD_MS) {
      // Streak expired
      return {
        activeStreak: 0,
        isClaimable: true,
        timeUntilNextMs: 0,
        streakLost: currentStreak > 0,
      };
    }

    // Between 24h and 48h: Streak active and ready to claim!
    return {
      activeStreak: currentStreak,
      isClaimable: true,
      timeUntilNextMs: 0,
      streakLost: false,
    };
  }

  /**
   * Calculates the rewards and updates streak on claim.
   */
  calculateClaim(lastDaily: Date | null, currentStreak: number): ClaimResult {
    const status = this.getStatus(lastDaily, currentStreak);

    if (!status.isClaimable) {
      return {
        success: false,
        xpEarned: 0,
        coinsEarned: 0,
        newStreak: status.activeStreak,
        cooldownRemainingMs: status.timeUntilNextMs,
      };
    }

    const newStreak = status.streakLost || status.activeStreak === 0 ? 1 : status.activeStreak + 1;

    // Capped streak multiplier bonus at 30 days
    const multiplier = Math.min(newStreak, 30);
    const xpEarned = 100 + multiplier * 20;
    const coinsEarned = 50 + multiplier * 10;

    return {
      success: true,
      xpEarned,
      coinsEarned,
      newStreak,
    };
  }
}

export const streakService = new StreakService();
